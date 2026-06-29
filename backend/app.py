from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db_connection, ensure_database, DATABASE
import sqlite3
import os
import sys
import threading
import shutil
import time
import logging
from logging.handlers import RotatingFileHandler
import json
import base64
import uuid
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import g
from dotenv import load_dotenv

load_dotenv() # Load variables from .env if present

# Business Logic Constants
PROFIT_MARGIN_ESTIMATE = 0.30
RATING_BASE = 4.5
RATING_SALES_DIVISOR = 10000.0
RATING_MULTIPLIER = 0.1
MAX_RATING = 5.0


if getattr(sys, 'frozen', False):
    static_folder = os.path.join(sys._MEIPASS, 'dist')
else:
    static_folder = '../dist'

app = Flask(__name__, static_folder=static_folder)
DEFAULT_SECRET_KEY = 'dev_secret_key_change_me'
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', DEFAULT_SECRET_KEY)

# Structured Logging Setup
class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record, self.datefmt),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
            'funcName': record.funcName
        }
        return json.dumps(log_data)

logger = logging.getLogger('autoparts_pos')
logger.setLevel(logging.INFO)
# Keep up to 5 logs of 5MB each
handler = RotatingFileHandler('pos_app.log', maxBytes=5*1024*1024, backupCount=5)
handler.setFormatter(StructuredFormatter())
logger.addHandler(handler)
console_handler = logging.StreamHandler()
logger.addHandler(console_handler)

app.logger.handlers = [handler, console_handler]
app.logger.setLevel(logging.INFO)
app.logger.info("Application started")

# CORS restrict later. Allowing all for LAN access, or could be restricted to specific IPs.
CORS(app, resources={r"/api/*": {"origins": "*"}})

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            g.user_id = data['user_id']
            g.user_role = data.get('role')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired!'}), 401
        except Exception as e:
            return jsonify({'error': 'Token is invalid!'}), 401
            
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(g, 'user_role') or g.user_role != 'admin':
            return jsonify({'error': 'Acceso denegado: Se requieren permisos de administrador'}), 403
        return f(*args, **kwargs)
    return decorated

@app.after_request
def apply_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return e
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "Error interno del servidor. Por favor, contacte al administrador."}), 500

ensure_database()

# Categories Endpoints
@app.route('/api/categories', methods=['GET'])
@token_required
def get_categories():
    conn = get_db_connection()
    try:
        categories = conn.execute('SELECT * FROM categories ORDER BY name ASC').fetchall()
        return jsonify([dict(c) for c in categories])
    finally:
        conn.close()

@app.route('/api/categories', methods=['POST'])
@token_required
@admin_required
def create_category():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Name is required'}), 400
        
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute('INSERT INTO categories (name) VALUES (?)', (name,))
        conn.commit()
        return jsonify({'id': cur.lastrowid, 'name': name}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Category already exists'}), 400
    finally:
        conn.close()

if os.environ.get('FLASK_ENV') == 'production' and app.config['SECRET_KEY'] == DEFAULT_SECRET_KEY:
    app.logger.warning(
        "SECRET_KEY no configurada en .env — defina una clave única antes de usar en producción"
    )

@app.route('/api/health', methods=['GET'])
def health_check():
    db_ok = os.path.exists(DATABASE)
    return jsonify({
        'status': 'ok' if db_ok else 'degraded',
        'database': 'connected' if db_ok else 'missing',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 200 if db_ok else 503

def migrate_passwords():
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            if cursor.fetchone():
                users = cursor.execute("SELECT id, username, password FROM users").fetchall()
                for user in users:
                    user_id = user['id']
                    pwd = user['password']
                    if not (pwd.startswith('scrypt:') or pwd.startswith('pbkdf2:') or pwd.startswith('bcrypt:')):
                        hashed = generate_password_hash(pwd)
                        cursor.execute("UPDATE users SET password = ? WHERE id = ?", (hashed, user_id))
                conn.commit()
        finally:
            conn.close()
    except Exception as e:
        print(f"Error migrating passwords: {e}")

migrate_passwords()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if user and check_password_hash(user['password'], password):
            if role and user['role'] != role:
                return jsonify({'error': 'Role mismatch'}), 401
                
            token = jwt.encode({
                'user_id': user['id'],
                'role': user['role'],
                'exp': datetime.now(timezone.utc) + timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
                
            return jsonify({
                'token': token,
                'id': user['id'],
                'username': user['username'],
                'role': user['role'],
                'name': user['name']
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    finally:
        conn.close()

@app.route('/api/users', methods=['GET'])
@token_required
@admin_required
def get_users():
    conn = get_db_connection()
    try:
        users = conn.execute('SELECT id, username, role, name FROM users').fetchall()
        return jsonify([dict(ix) for ix in users])
    finally:
        conn.close()

@app.route('/api/users', methods=['POST'])
@token_required
@admin_required
def create_user():
    data = request.json

    # Input validation
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', '').strip()
    name = data.get('name', '').strip()
    valid_roles = ('admin', 'vendedor')

    if not username:
        return jsonify({'error': 'El nombre de usuario es obligatorio'}), 400
    if not password:
        return jsonify({'error': 'La contraseña es obligatoria'}), 400
    if not name:
        return jsonify({'error': 'El nombre es obligatorio'}), 400
    if not role:
        return jsonify({'error': 'El rol es obligatorio'}), 400
    if role not in valid_roles:
        return jsonify({'error': f"Rol inválido. Debe ser uno de: {', '.join(valid_roles)}"}), 400

    try:
        hashed_password = generate_password_hash(password)
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
                        (username, hashed_password, role, name))
            conn.commit()
            new_id = cur.lastrowid
            return jsonify({'success': True, 'id': new_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(id):
    if id == g.user_id:
        return jsonify({'error': 'No puedes eliminar tu propio usuario mientras estás conectado'}), 400
    try:
        conn = get_db_connection()
        try:
            target = conn.execute('SELECT id, role FROM users WHERE id = ?', (id,)).fetchone()
            if not target:
                return jsonify({'error': 'Usuario no encontrado'}), 404
            if target['role'] == 'admin':
                admin_count = conn.execute(
                    "SELECT COUNT(*) as c FROM users WHERE role = 'admin'"
                ).fetchone()['c']
                if admin_count <= 1:
                    return jsonify({'error': 'No se puede eliminar al último administrador'}), 400
            conn.execute('DELETE FROM users WHERE id = ?', (id,))
            conn.commit()
            return jsonify({'success': True})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/me/password', methods=['PUT'])
@token_required
def change_own_password():
    data = request.json or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '').strip()

    if not current_password:
        return jsonify({'error': 'La contraseña actual es obligatoria'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}), 400

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT id, password FROM users WHERE id = ?', (g.user_id,)).fetchone()
        if not user or not check_password_hash(user['password'], current_password):
            return jsonify({'error': 'La contraseña actual es incorrecta'}), 401
        hashed = generate_password_hash(new_password)
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (hashed, g.user_id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

@app.route('/api/users/<int:id>/password', methods=['PUT'])
@token_required
@admin_required
def reset_user_password(id):
    data = request.json or {}
    new_password = data.get('password', '').strip()

    if len(new_password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

    conn = get_db_connection()
    try:
        target = conn.execute('SELECT id FROM users WHERE id = ?', (id,)).fetchone()
        if not target:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        hashed = generate_password_hash(new_password)
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (hashed, id))
        conn.commit()
        return jsonify({'success': True})
    finally:
        conn.close()

# --- PRODUCTS ENDPOINTS ---

@app.route('/api/products', methods=['GET'])
@token_required
def get_products():
    conn = get_db_connection()
    try:
        products = conn.execute('SELECT * FROM products').fetchall()
    finally:
        conn.close()
    # Map backend fields to frontend expected props (e.g., min_stock -> min)
    result = []
    for p in products:
        p_dict = dict(p)
        p_dict['min'] = p_dict['min_stock'] # Alias for frontend
        result.append(p_dict)
    return jsonify(result)

@app.route('/api/products', methods=['POST'])
@token_required
@admin_required
def add_product():
    data = request.json

    # Input validation
    if not data.get('name', '').strip():
        return jsonify({'error': 'El nombre del producto es obligatorio'}), 400
    try:
        price = float(data.get('price', 0))
        stock = int(data.get('stock', 0))
        min_stock = int(data.get('min', 0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Precio, stock y stock mínimo deben ser valores numéricos'}), 400
    if price <= 0:
        return jsonify({'error': 'El precio debe ser mayor a 0'}), 400
    if stock < 0:
        return jsonify({'error': 'El stock no puede ser negativo'}), 400
    if min_stock < 0:
        return jsonify({'error': 'El stock mínimo no puede ser negativo'}), 400

    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('''
                INSERT INTO products (name, brand, origin, code, category, stock, price, min_stock, image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (data['name'], data['brand'], data.get('origin', ''), data['code'], data['category'], 
                  stock, price, min_stock, data.get('image')))
            conn.commit()
            new_id = cur.lastrowid
            return jsonify({'success': True, 'id': new_id})
        except sqlite3.IntegrityError:
            conn.rollback()
            return jsonify({'error': 'Code must be unique'}), 400
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_product(id):
    data = request.json

    # Input validation
    if not data.get('name', '').strip():
        return jsonify({'error': 'El nombre del producto es obligatorio'}), 400
    try:
        price = float(data.get('price', 0))
        stock = int(data.get('stock', 0))
        min_stock = int(data.get('min', 0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Precio, stock y stock mínimo deben ser valores numéricos'}), 400
    if price <= 0:
        return jsonify({'error': 'El precio debe ser mayor a 0'}), 400
    if stock < 0:
        return jsonify({'error': 'El stock no puede ser negativo'}), 400
    if min_stock < 0:
        return jsonify({'error': 'El stock mínimo no puede ser negativo'}), 400

    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('''
                UPDATE products 
                SET name=?, brand=?, origin=?, code=?, category=?, stock=?, price=?, min_stock=?, image=?
                WHERE id=?
            ''', (data['name'], data['brand'], data.get('origin', ''), data.get('code', ''), data['category'], 
                  stock, price, min_stock, data.get('image'), id))
            conn.commit()
            return jsonify({'success': True})
        except sqlite3.IntegrityError:
            conn.rollback()
            return jsonify({'error': 'Code must be unique'}), 400
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_product(id):
    try:
        conn = get_db_connection()
        try:
            # Check for dependencies in related tables
            dep_tables = [
                ('sale_items', 'product_id', 'ventas'),
                ('quotation_items', 'product_id', 'cotizaciones'),
                ('return_items', 'product_id', 'devoluciones'),
                ('transfer_items', 'product_id', 'transferencias'),
                ('purchase_order_items', 'product_id', 'órdenes de compra'),
            ]
            dependencies = []
            for table, col, label in dep_tables:
                row = conn.execute(f'SELECT COUNT(*) as cnt FROM {table} WHERE {col} = ?', (id,)).fetchone()
                if row and row['cnt'] > 0:
                    dependencies.append(label)
    
            if dependencies:
                return jsonify({
                    'error': f"No se puede eliminar el producto porque tiene registros asociados en: {', '.join(dependencies)}"
                }), 400
    
            conn.execute('DELETE FROM products WHERE id=?', (id,))
            conn.commit()
            return jsonify({'success': True})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- TRANSFERS ENDPOINTS ---

@app.route('/api/transfers', methods=['GET'])
@token_required
def get_transfers():
    conn = get_db_connection()
    try:
        transfers = conn.execute('SELECT * FROM transfers ORDER BY created_at DESC LIMIT 100').fetchall()
        
        result = []
        for t in transfers:
            t_dict = dict(t)
            # Fetch items for this transfer
            items = conn.execute('''
                SELECT ti.*, p.name, p.code, p.brand 
                FROM transfer_items ti
                JOIN products p ON ti.product_id = p.id
                WHERE ti.transfer_id = ?
            ''', (t['id'],)).fetchall()
            
            t_dict['productList'] = [dict(i) for i in items]
            t_dict['items'] = f"{len(items)} items" # Helper string for table
            result.append(t_dict)
            
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/transfers', methods=['POST'])
@token_required
def create_transfer():
    data = request.json
    if not data.get('origin') or not data.get('destination'):
        return jsonify({'error': 'Origen y destino son obligatorios'}), 400
    if not data.get('items') or len(data['items']) == 0:
        return jsonify({'error': 'La transferencia debe tener al menos un producto'}), 400
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            
            # Create transfer record
            cur.execute('''
                INSERT INTO transfers (origin, destination, status, date, notes) 
                VALUES (?, ?, ?, ?, ?)
            ''', (data['origin'], data['destination'], 'Pendiente', data['date'], data['notes']))
            transfer_id = cur.lastrowid
            
            # Add items
            for item in data['items']:
                # item has {id (product_id), quantity}
                cur.execute('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
                            (transfer_id, item['id'], item['quantity']))
                
            conn.commit()
            return jsonify({'success': True, 'id': transfer_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/transfers/<int:id>/status', methods=['PUT'])
@token_required
def update_transfer_status(id):
    data = request.json
    new_status = data.get('status')
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('BEGIN IMMEDIATE') # Previene race conditions al bloquear lecturas de escritura concurrentes
            
            # Check current status
            current_status_row = cur.execute('SELECT status FROM transfers WHERE id = ?', (id,)).fetchone()
            if not current_status_row:
                return jsonify({'error': 'Transferencia no encontrada'}), 404
            if current_status_row['status'] == new_status:
                return jsonify({'success': True})
    
            if new_status == 'Completado' and current_status_row['status'] != 'Completado':
                # Get all items for this transfer
                items = cur.execute('''
                    SELECT ti.product_id, ti.quantity, p.stock, p.name
                    FROM transfer_items ti
                    JOIN products p ON ti.product_id = p.id
                    WHERE ti.transfer_id = ?
                ''', (id,)).fetchall()
    
                # Validate stock for all items first
                for item in items:
                    if item['stock'] < item['quantity']:
                        return jsonify({
                            'error': f"Stock insuficiente para '{item['name']}'. Disponible: {item['stock']}, Requerido: {item['quantity']}"
                        }), 400
    
                # Subtract stock for each item
                for item in items:
                    cur.execute('UPDATE products SET stock = stock - ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
                                
            elif new_status != 'Completado' and current_status_row['status'] == 'Completado':
                items = cur.execute('SELECT product_id, quantity FROM transfer_items WHERE transfer_id = ?', (id,)).fetchall()
                for item in items:
                    cur.execute('UPDATE products SET stock = stock + ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
    
            # Update the status
            cur.execute('UPDATE transfers SET status = ? WHERE id = ?', (new_status, id))
            conn.commit()
            return jsonify({'success': True})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- PURCHASE ORDERS ENDPOINTS ---

@app.route('/api/purchase-orders', methods=['GET'])
@token_required
def get_purchase_orders():
    conn = get_db_connection()
    try:
        orders = conn.execute('SELECT id, supplier, total, status, created_at as date FROM purchase_orders ORDER BY created_at DESC').fetchall()
        result = []
        for o in orders:
            o_dict = dict(o)
            # Return raw numeric total — let the frontend format it
            o_dict['date'] = o_dict['date'].split(' ')[0] if o_dict['date'] else ''
            result.append(o_dict)
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/purchase-orders', methods=['POST'])
@token_required
def create_purchase_order():
    data = request.json
    if not data.get('supplier') or not str(data['supplier']).strip():
        return jsonify({'error': 'El proveedor es obligatorio'}), 400
    if data.get('total') is None or float(data['total']) <= 0:
        return jsonify({'error': 'El total debe ser mayor a 0'}), 400
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('INSERT INTO purchase_orders (supplier, total, status) VALUES (?, ?, ?)',
                        (data['supplier'], data['total'], data.get('status', 'Borrador')))
            new_id = cur.lastrowid
    
            # Insert items if provided
            items = data.get('items', [])
            for item in items:
                cur.execute(
                    'INSERT INTO purchase_order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    (new_id, item['product_id'], item['quantity'], item['price']))
    
            conn.commit()
            return jsonify({'success': True, 'id': new_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:id>/status', methods=['PUT'])
@token_required
def update_purchase_order_status(id):
    data = request.json
    new_status = data.get('status')
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('BEGIN IMMEDIATE') # Previene race conditions al bloquear lecturas de escritura concurrentes
            
            current_status_row = cur.execute('SELECT status FROM purchase_orders WHERE id = ?', (id,)).fetchone()
            if not current_status_row:
                return jsonify({'error': 'Orden de compra no encontrada'}), 404
            if current_status_row['status'] == new_status:
                return jsonify({'success': True})
    
            if new_status == 'Recibido' and current_status_row['status'] != 'Recibido':
                # Get all items for this purchase order and increment stock
                items = cur.execute('''
                    SELECT product_id, quantity FROM purchase_order_items
                    WHERE order_id = ?
                ''', (id,)).fetchall()
                for item in items:
                    cur.execute('UPDATE products SET stock = stock + ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
                                
            elif new_status != 'Recibido' and current_status_row['status'] == 'Recibido':
                items = cur.execute('SELECT product_id, quantity FROM purchase_order_items WHERE order_id = ?', (id,)).fetchall()
                for item in items:
                    cur.execute('UPDATE products SET stock = stock - ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
    
            cur.execute('UPDATE purchase_orders SET status = ? WHERE id = ?', (new_status, id))
            conn.commit()
            return jsonify({'success': True})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purchase-orders/<int:id>/items', methods=['POST'])
@token_required
def add_purchase_order_items(id):
    data = request.json
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                'INSERT INTO purchase_order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                (id, data['product_id'], data['quantity'], data['price']))
            conn.commit()
            new_item_id = cur.lastrowid
            return jsonify({'success': True, 'id': new_item_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- RMA / RETURNS ENDPOINTS ---

@app.route('/api/returns', methods=['GET'])
@token_required
def get_returns():
    conn = get_db_connection()
    try:
        vendor = request.args.get('vendor', 'All')
        query = '''
            SELECT r.id, r.reason, r.total_refunded as total, r.status, r.created_at as date,
                   r.description, r.evidence_images,
                   COALESCE(c.name, 'Cliente General') as client, s.payment_method as invoice,
                   u.name as vendor_name, u2.name as processed_by_name
            FROM returns r
            JOIN sales s ON r.sale_id = s.id
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN users u2 ON r.processed_by_id = u2.id
        '''
        
        if vendor != 'All':
            query += " WHERE u.name = ? ORDER BY r.created_at DESC"
            returns = conn.execute(query, (vendor,)).fetchall()
        else:
            query += " ORDER BY r.created_at DESC"
            returns = conn.execute(query).fetchall()
        
        result = []
        for r in returns:
            r_dict = dict(r)
            r_dict['date'] = r_dict['date'].split(' ')[0] if r_dict['date'] else ''
            # parse evidence
            if r_dict['evidence_images']:
                try:
                    r_dict['evidence_images'] = json.loads(r_dict['evidence_images'])
                except:
                    r_dict['evidence_images'] = []
            else:
                r_dict['evidence_images'] = []
            result.append(r_dict)
            
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/returns/<int:id>/status', methods=['PUT'])
@token_required
def update_return_status(id):
    data = request.json
    new_status = data.get('status')
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('BEGIN IMMEDIATE') # Previene race conditions al bloquear lecturas de escritura concurrentes
            
            current_status_row = cur.execute('SELECT status FROM returns WHERE id = ?', (id,)).fetchone()
            if not current_status_row:
                return jsonify({'error': 'Devolución no encontrada'}), 404
            if current_status_row['status'] == new_status:
                return jsonify({'success': True})
                
            if new_status in ['Aprobado', 'Completado', 'approved'] and current_status_row['status'] not in ['Aprobado', 'Completado', 'approved']:
                items = cur.execute('SELECT product_id, quantity FROM return_items WHERE return_id = ?', (id,)).fetchall()
                for item in items:
                    cur.execute('UPDATE products SET stock = stock + ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
                                
            elif new_status not in ['Aprobado', 'Completado', 'approved'] and current_status_row['status'] in ['Aprobado', 'Completado', 'approved']:
                items = cur.execute('SELECT product_id, quantity FROM return_items WHERE return_id = ?', (id,)).fetchall()
                for item in items:
                    cur.execute('UPDATE products SET stock = stock - ? WHERE id = ?',
                                (item['quantity'], item['product_id']))
                                
            cur.execute('UPDATE returns SET status = ? WHERE id = ?', (new_status, id))
            conn.commit()
            return jsonify({'success': True})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- SALES & DASHBOARD ENDPOINTS ---

@app.route('/api/sales', methods=['POST'])
@token_required
def create_sale():
    data = request.json
    items = data.get('items') # List of {id, quantity, price}
    total = data.get('total')
    user_id = getattr(g, 'user_id', None)
    if not user_id:
        return jsonify({'error': 'Usuario no autenticado correctamente'}), 401
    client_id = data.get('client_id')
    payment_method = data.get('payment_method')
    discount_code = data.get('discount_code', '').strip().upper()

    # Input validation
    try:
        total_val = float(total) if total is not None else 0
    except (ValueError, TypeError):
        return jsonify({'error': 'El total debe ser un valor numérico'}), 400
    if total_val <= 0:
        return jsonify({'error': 'El total debe ser mayor a 0'}), 400
    if not items or len(items) == 0:
        return jsonify({'error': 'La venta debe tener al menos un producto'}), 400
    for idx, item in enumerate(items):
        if 'id' not in item:
            return jsonify({'error': f'Falta el ID del producto en el ítem #{idx+1}'}), 400
        try:
            qty = int(item.get('quantity', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Cantidad inválida en el producto #{idx+1}'}), 400
        if qty <= 0:
            return jsonify({'error': f'La cantidad debe ser mayor a 0 en el producto #{idx+1}'}), 400
            
        if 'price' not in item:
            return jsonify({'error': f'Precio faltante en el producto #{idx+1}'}), 400
        try:
            item_price = float(item['price'])
        except (ValueError, TypeError):
            return jsonify({'error': f'Precio inválido en el producto #{idx+1}'}), 400
        if item_price < 0:
            return jsonify({'error': f'El precio no puede ser negativo en el producto #{idx+1}'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute('BEGIN IMMEDIATE')
        
        # Create Sale with payment_method
        cur.execute('INSERT INTO sales (total, user_id, client_id, payment_method) VALUES (?, ?, ?, ?)',
                    (total, user_id, client_id, payment_method))
        sale_id = cur.lastrowid
        
        # Add items and update stock
        real_total = 0
        for item in items:
            # Check stock
            product_row = cur.execute('SELECT stock, price FROM products WHERE id = ?', (item['id'],)).fetchone()
            if not product_row:
                conn.rollback()
                return jsonify({'error': f"El producto ID {item['id']} no existe en la base de datos."}), 400
            if product_row['stock'] < item['quantity']:
                conn.rollback()
                return jsonify({'error': f"Stock insuficiente para el producto ID {item['id']}"}), 400

            real_price = product_row['price']
            real_total += real_price * item['quantity']

            cur.execute('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', 
                        (sale_id, item['id'], item['quantity'], real_price))
            
            # Atomic stock update
            cur.execute('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', 
                        (item['quantity'], item['id'], item['quantity']))
            if cur.rowcount == 0:
                conn.rollback()
                return jsonify({'error': f"Stock insuficiente (concurrencia) para el producto ID {item['id']}"}), 400
        
        # Apply discount
        if discount_code == 'PROMO10':
            real_total = real_total * 0.90
            
        # Update real total
        cur.execute('UPDATE sales SET total = ? WHERE id = ?', (real_total, sale_id))
        
        conn.commit()
        return jsonify({'success': True, 'sale_id': sale_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/dashboard/stats', methods=['GET'])
@token_required
@admin_required
def get_dashboard_stats():
    conn = get_db_connection()
    try:
        period = request.args.get('period', 'all')
        s_where = ""
        r_where = "WHERE status IN ('Aprobado', 'Completado', 'approved')"
        
        if period == 'daily':
            s_where = "WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')"
            r_where += " AND DATE(created_at, 'localtime') = DATE('now', 'localtime')"
        elif period == 'monthly':
            s_where = "WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')"
            r_where += " AND strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')"

        # 1. Total Revenue
        total_revenue_row = conn.execute(f'SELECT SUM(total) as total FROM sales {s_where}').fetchone()
        gross_revenue = total_revenue_row['total'] if total_revenue_row['total'] else 0
        
        refunds_row = conn.execute(f"SELECT SUM(total_refunded) as total FROM returns {r_where}").fetchone()
        total_refunds = refunds_row['total'] if refunds_row['total'] else 0
        
        total_revenue = gross_revenue - total_refunds
        
        # 2. Net Profit (Estimated using PROFIT_MARGIN_ESTIMATE)
        net_profit = total_revenue * PROFIT_MARGIN_ESTIMATE
    
        # 3. Active Customers (Proxy: Count of distinct clients)
        c_where = f"{s_where} AND client_id IS NOT NULL" if s_where else "WHERE client_id IS NOT NULL"
        active_customers_row = conn.execute(f'SELECT COUNT(DISTINCT client_id) as count FROM sales {c_where}').fetchone()
        active_customers = active_customers_row['count'] if active_customers_row else 0
    
        # 4. Low Inventory (Stock <= min_stock)
        low_inventory_row = conn.execute('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock').fetchone()
        low_inventory = low_inventory_row['count'] if low_inventory_row else 0
        
        # 5. Top Sellers
        s_alias_where = s_where.replace('created_at', 's.created_at')
        top_sellers_query = f'''
            SELECT u.name, SUM(s.total) as total_sales, COUNT(s.id) as deals
            FROM sales s
            JOIN users u ON s.user_id = u.id
            {s_alias_where}
            GROUP BY u.id
            ORDER BY total_sales DESC
            LIMIT 5
        '''
        top_sellers_rows = conn.execute(top_sellers_query).fetchall()
        
        top_sellers = []
        for row in top_sellers_rows:
            rating = RATING_BASE + (RATING_MULTIPLIER * (row['total_sales'] / RATING_SALES_DIVISOR)) if row['total_sales'] else RATING_BASE
            rating = min(round(rating, 1), MAX_RATING)
            
            top_sellers.append({
                'name': row['name'],
                'sales': row['total_sales'],
                'deals': row['deals'],
                'rating': rating
            })
    
        stats = {
            'total_revenue': total_revenue,
            'net_profit': net_profit,
            'active_customers': active_customers,
            'low_inventory': low_inventory,
            'top_sellers': top_sellers
        }
        
        return jsonify(stats)
    finally:
        conn.close()

@app.route('/api/reports/stats', methods=['GET'])
@token_required
@admin_required
def get_reports_stats():
    conn = get_db_connection()
    try:
        vendor = request.args.get('vendor', 'All')
        
        if vendor != 'All':
            total_revenue_row = conn.execute('''
                SELECT SUM(s.total) as total 
                FROM sales s 
                JOIN users u ON s.user_id = u.id 
                WHERE u.name = ?
            ''', (vendor,)).fetchone()
            
            refunds_row = conn.execute('''
                SELECT SUM(r.total_refunded) as total 
                FROM returns r 
                JOIN sales s ON r.sale_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE r.status IN ('Aprobado', 'Completado', 'approved') AND u.name = ?
            ''', (vendor,)).fetchone()
            
            total_sales_count = conn.execute('''
                SELECT COUNT(s.id) as count 
                FROM sales s
                JOIN users u ON s.user_id = u.id
                WHERE u.name = ?
            ''', (vendor,)).fetchone()['count']
        else:
            total_revenue_row = conn.execute('SELECT SUM(total) as total FROM sales').fetchone()
            refunds_row = conn.execute("SELECT SUM(total_refunded) as total FROM returns WHERE status IN ('Aprobado', 'Completado', 'approved')").fetchone()
            total_sales_count = conn.execute('SELECT COUNT(*) as count FROM sales').fetchone()['count']

        gross_revenue = total_revenue_row['total'] if total_revenue_row['total'] else 0
        total_refunds = refunds_row['total'] if refunds_row['total'] else 0
        total_revenue = gross_revenue - total_refunds
        
        low_stock_count = conn.execute('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock').fetchone()['count']
        
        return jsonify({
            'total_revenue': total_revenue,
            'total_sales_count': total_sales_count,
            'low_stock_count': low_stock_count,
            'total_refunds': total_refunds
        })
    finally:
        conn.close()

@app.route('/api/reports/sales', methods=['GET'])
@token_required
@admin_required
def get_sales_report():
    conn = get_db_connection()
    try:
        vendor = request.args.get('vendor', 'All')
        
        if vendor != 'All':
            sales = conn.execute('''
                SELECT s.id, s.total, s.created_at, u.name as vendor_name, u.role 
                FROM sales s 
                LEFT JOIN users u ON s.user_id = u.id 
                WHERE s.total > (SELECT COALESCE(SUM(total_refunded), 0) FROM returns r WHERE r.sale_id = s.id AND r.status IN ('Aprobado', 'Completado', 'approved'))
                AND u.name = ?
                ORDER BY s.created_at DESC 
            ''', (vendor,)).fetchall()
        else:
            sales = conn.execute('''
                SELECT s.id, s.total, s.created_at, u.name as vendor_name, u.role 
                FROM sales s 
                LEFT JOIN users u ON s.user_id = u.id 
                WHERE s.total > (SELECT COALESCE(SUM(total_refunded), 0) FROM returns r WHERE r.sale_id = s.id AND r.status IN ('Aprobado', 'Completado', 'approved'))
                ORDER BY s.created_at DESC 
            ''').fetchall()
            
        return jsonify([dict(row) for row in sales])
    finally:
        conn.close()

@app.route('/api/reports/sales-by-category', methods=['GET'])
@token_required
def get_sales_by_category():
    conn = get_db_connection()
    try:
        vendor = request.args.get('vendor', 'All')
        
        if vendor != 'All':
            rows = conn.execute('''
                SELECT p.category, SUM(si.quantity) as total_quantity, SUM(si.price * si.quantity) as total_revenue
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                JOIN sales s ON si.sale_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE u.name = ?
                GROUP BY p.category
                ORDER BY total_revenue DESC
            ''', (vendor,)).fetchall()
        else:
            rows = conn.execute('''
                SELECT p.category, SUM(si.quantity) as total_quantity, SUM(si.price * si.quantity) as total_revenue
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                JOIN sales s ON si.sale_id = s.id
                GROUP BY p.category
                ORDER BY total_revenue DESC
            ''').fetchall()
            
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/reports/sales-timeline', methods=['GET'])
@token_required
@admin_required
def get_sales_timeline():
    """Get sales for chart visualization based on period"""
    conn = get_db_connection()
    try:
        period = request.args.get('period', 'all')
        where_clause = ""
        group_by = "date(created_at, 'localtime')"
        
        if period == 'daily':
            where_clause = "WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')"
            group_by = "strftime('%H:00', created_at, 'localtime')" # Group by hour
        elif period == 'monthly':
            where_clause = "WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')"
            group_by = "date(created_at, 'localtime')"
            
        # Get sales grouped
        sales_by_day = conn.execute(f'''
            SELECT 
                {group_by} as sale_date,
                SUM(total) as value
            FROM sales
            {where_clause}
            GROUP BY sale_date
            ORDER BY sale_date ASC
        ''').fetchall()
        
        # We can format it nicely to string if needed, or just return sale_date
        result = []
        for row in sales_by_day:
            result.append({
                'name': row['sale_date'],
                'value': row['value']
            })
        
        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications():
    conn = get_db_connection()
    try:
        products = conn.execute('SELECT id, name, stock FROM products WHERE stock <= min_stock').fetchall()
        
        notifications = []
        for product in products:
            notifications.append({
                'id': f"low-stock-{product['id']}-{product['stock']}",
                'type': 'low_stock',
                'title': 'Stock Bajo',
                'message': f"El producto {product['name']} tiene solo {product['stock']} unidades.",
                'priority': 'high' if product['stock'] == 0 else 'medium',
                'timestamp': 'Ahora' 
            })
            
        return jsonify(notifications)
    finally:
        conn.close()

# --- CLIENTS, QUOTATIONS, RETURNS ---

@app.route('/api/clients', methods=['GET', 'POST'])
@token_required
def handle_clients():
    if request.method == 'GET':
        conn = get_db_connection()
        try:
            search = request.args.get('search', '')
            if search:
                clients = conn.execute("SELECT * FROM clients WHERE name LIKE ? OR email LIKE ?", 
                                     (f'%{search}%', f'%{search}%')).fetchall()
            else:
                clients = conn.execute('SELECT * FROM clients').fetchall()
            return jsonify([dict(ix) for ix in clients])
        finally:
            conn.close()
    
    if request.method == 'POST':
        data = request.json
        if not data.get('name') or not str(data['name']).strip():
            return jsonify({'error': 'El nombre del cliente es obligatorio'}), 400
        try:
            conn = get_db_connection()
            try:
                cur = conn.cursor()
                cur.execute('INSERT INTO clients (name, email, phone, ci_nit) VALUES (?, ?, ?, ?)',
                            (data['name'], data.get('email', ''), data.get('phone', ''), data.get('ci_nit', '')))
                conn.commit()
                new_id = cur.lastrowid
                return jsonify({'success': True, 'id': new_id, 'name': data['name']})
            except Exception as inner_e:
                conn.rollback()
                raise inner_e
            finally:
                conn.close()
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@app.route('/api/quotations/<int:id>', methods=['GET'])
@token_required
def get_quotation(id):
    conn = get_db_connection()
    try:
        # Fetch Quotation & Client
        quote = conn.execute('''
            SELECT q.*, c.name as client_name, c.email as client_email, c.phone as client_phone, c.ci_nit as client_ci
            FROM quotations q
            LEFT JOIN clients c ON q.client_id = c.id
            WHERE q.id = ?
        ''', (id,)).fetchone()
        
        if not quote:
            return jsonify({'error': 'Quotation not found'}), 404
            
        quote_dict = dict(quote)
        
        # Structure client object
        quote_dict['client'] = {
            'id': quote['client_id'],
            'name': quote['client_name'],
            'email': quote['client_email'],
            'phone': quote['client_phone'],
            'ci_nit': quote['client_ci']
        }
        
        # Fetch Items
        items = conn.execute('''
            SELECT qi.quantity, qi.price, p.name, p.code, p.brand
            FROM quotation_items qi
            JOIN products p ON qi.product_id = p.id
            WHERE qi.quotation_id = ?
        ''', (id,)).fetchall()
        
        quote_dict['items'] = [dict(i) for i in items]
        
        return jsonify(quote_dict)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/quotations', methods=['POST'])
@token_required
def create_quotation():
    data = request.json
    discount_code = data.get('discount_code', '').strip().upper()
    if data.get('total') is None or float(data['total']) <= 0:
        return jsonify({'error': 'El total debe ser mayor a 0'}), 400
    if not data.get('items') or len(data['items']) == 0:
        return jsonify({'error': 'La cotización debe tener al menos un producto'}), 400
    try:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('''
                INSERT INTO quotations (client_id, total, origin, delivery_date, validity_date, payment_type) 
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                data.get('client_id'), 
                0, 
                data.get('origin', ''), 
                data.get('delivery_date', ''), 
                data.get('validity_date', ''), 
                data.get('payment_type', '')
            ))
            quote_id = cur.lastrowid
            
            real_total = 0
            for item in data['items']:
                if 'id' not in item:
                    conn.rollback()
                    return jsonify({'error': 'Falta el ID del producto en un ítem'}), 400
                product_row = cur.execute('SELECT price FROM products WHERE id = ?', (item['id'],)).fetchone()
                if not product_row:
                    conn.rollback()
                    return jsonify({'error': f"El producto ID {item['id']} no existe."}), 400
                
                real_price = product_row['price']
                real_total += real_price * item['quantity']
                
                cur.execute('INSERT INTO quotation_items (quotation_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                            (quote_id, item['id'], item['quantity'], real_price))
            
            # Apply discount
            if discount_code == 'PROMO10':
                real_total = real_total * 0.90
                
            cur.execute('UPDATE quotations SET total = ? WHERE id = ?', (real_total, quote_id))
            conn.commit()
            return jsonify({'success': True, 'id': quote_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/uploads/returns/<filename>', methods=['GET'])
@token_required
def get_return_upload(filename):
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else (os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
    uploads_dir = os.path.join(base_dir, 'uploads', 'returns')
    return send_from_directory(uploads_dir, filename)

@app.route('/api/uploads/qr/<filename>', methods=['GET'])
def get_qr_upload(filename):
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else (os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
    uploads_dir = os.path.join(base_dir, 'uploads', 'qr')
    return send_from_directory(uploads_dir, filename)

@app.route('/api/settings/qr', methods=['POST'])
@token_required
def upload_qr():
    if getattr(g, 'user_role', '') != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    data = request.json
    method = data.get('method')
    image_b64 = data.get('image')
    
    if not method or str(method) not in ['1', '2', '3']:
        return jsonify({'error': 'Método inválido'}), 400
    if not image_b64:
        return jsonify({'error': 'Imagen faltante'}), 400
        
    base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else (os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
    uploads_dir = os.path.join(base_dir, 'uploads', 'qr')
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        
    if image_b64.startswith('data:image'):
        header, encoded = image_b64.split(",", 1)
        filename = f"qr_method_{method}.png"
        with open(os.path.join(uploads_dir, filename), "wb") as fh:
            fh.write(base64.b64decode(encoded))
        return jsonify({'success': True, 'filename': filename})
    return jsonify({'error': 'Formato de imagen inválido'}), 400

@app.route('/api/returns', methods=['POST'])
@token_required
def create_return():
    data = request.json
    try:
        description = data.get('description', '')
        reason = data.get('reason', '')
        images_data = data.get('evidence_images', [])
        
        # Save base64 images
        saved_images = []
        base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else (os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
        uploads_dir = os.path.join(base_dir, 'uploads', 'returns')
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
            
        for img_b64 in images_data:
            if img_b64.startswith('data:image'):
                header, encoded = img_b64.split(",", 1)
                ext = header.split(';')[0].split('/')[1]
                filename = f"{uuid.uuid4().hex}.{ext}"
                with open(os.path.join(uploads_dir, filename), "wb") as fh:
                    fh.write(base64.b64decode(encoded))
                saved_images.append(filename)

        images_json = json.dumps(saved_images)

        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('INSERT INTO returns (sale_id, reason, description, evidence_images, total_refunded, processed_by_id) VALUES (?, ?, ?, ?, 0, ?)',
                        (data['sale_id'], reason, description, images_json, getattr(g, 'user_id', None)))
            return_id = cur.lastrowid
            
            real_refund = 0
            for item in data['items']:
                sale_item = cur.execute('SELECT price FROM sale_items WHERE sale_id = ? AND product_id = ?', 
                                      (data['sale_id'], item['product_id'])).fetchone()
                if sale_item:
                    real_refund += sale_item['price'] * item['quantity']
                    
                cur.execute('INSERT INTO return_items (return_id, product_id, quantity) VALUES (?, ?, ?)',
                            (return_id, item['product_id'], item['quantity']))
                # Stock is NOT updated here anymore, waiting for approval
                
            cur.execute('UPDATE returns SET total_refunded = ? WHERE id = ?', (real_refund, return_id))
            conn.commit()
            return jsonify({'success': True, 'id': return_id})
        except Exception as inner_e:
            conn.rollback()
            raise inner_e
        finally:
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- NEW ENDPOINTS: Sales, Inventory, Reports ---

@app.route('/api/sales', methods=['GET'])
@token_required
@admin_required
def get_all_sales():
    conn = get_db_connection()
    try:
        sales = conn.execute('''
            SELECT s.id, s.total, s.created_at, u.name as vendor_name, c.name as client_name
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN clients c ON s.client_id = c.id
            ORDER BY s.created_at DESC LIMIT 100
        ''').fetchall()
        return jsonify([dict(row) for row in sales])
    finally:
        conn.close()

@app.route('/api/reports/products', methods=['GET'])
@token_required
@admin_required
def get_reports_products():
    conn = get_db_connection()
    try:
        products = conn.execute('SELECT id, name, stock, min_stock, price FROM products ORDER BY stock ASC').fetchall()
        return jsonify([dict(row) for row in products])
    finally:
        conn.close()

@app.route('/api/reports/inventory', methods=['GET'])
@token_required
@admin_required
def get_reports_inventory():
    conn = get_db_connection()
    try:
        total_value = conn.execute('SELECT SUM(stock * price) as value FROM products').fetchone()['value'] or 0
        total_items = conn.execute('SELECT SUM(stock) as count FROM products').fetchone()['count'] or 0
        return jsonify({'total_value': total_value, 'total_items': total_items})
    finally:
        conn.close()

@app.route('/api/inventory/low-stock', methods=['GET'])
@token_required
def get_low_stock():
    conn = get_db_connection()
    try:
        products = conn.execute('SELECT * FROM products WHERE stock <= min_stock').fetchall()
        return jsonify([dict(row) for row in products])
    finally:
        conn.close()

@app.route('/api/inventory/movements', methods=['GET'])
@token_required
@admin_required
def get_movements():
    conn = get_db_connection()
    try:
        sales = conn.execute('''
            SELECT 'Salida' as type, p.name as product_name, p.code as product_code, 
                   si.quantity, u.name as user_name, s.created_at
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC LIMIT 20
        ''').fetchall()
        
        returns = conn.execute('''
            SELECT 'Entrada' as type, p.name as product_name, p.code as product_code, 
                   ri.quantity, 'Sistema' as user_name, r.created_at
            FROM return_items ri
            JOIN returns r ON ri.return_id = r.id
            JOIN products p ON ri.product_id = p.id
            ORDER BY r.created_at DESC LIMIT 20
        ''').fetchall()
        
        purchases = conn.execute('''
            SELECT 'Entrada' as type, p.name as product_name, p.code as product_code, 
                   poi.quantity, 'Proveedor' as user_name, po.created_at
            FROM purchase_order_items poi
            JOIN purchase_orders po ON poi.order_id = po.id
            JOIN products p ON poi.product_id = p.id
            WHERE po.status = 'Recibido'
            ORDER BY po.created_at DESC LIMIT 20
        ''').fetchall()

        transfers = conn.execute('''
            SELECT 'Salida' as type, p.name as product_name, p.code as product_code, 
                   ti.quantity, t.destination as user_name, t.created_at
            FROM transfer_items ti
            JOIN transfers t ON ti.transfer_id = t.id
            JOIN products p ON ti.product_id = p.id
            WHERE t.status = 'Completado'
            ORDER BY t.created_at DESC LIMIT 20
        ''').fetchall()
        
        all_movs = [dict(s) for s in sales] + [dict(r) for r in returns] + [dict(p) for p in purchases] + [dict(t) for t in transfers]
        all_movs.sort(key=lambda x: x['created_at'], reverse=True)
        return jsonify(all_movs[:40])
    finally:
        conn.close()



@app.route('/api/suppliers', methods=['GET'])
@token_required
def get_suppliers():
    conn = get_db_connection()
    try:
        sups = conn.execute('SELECT DISTINCT supplier as name FROM purchase_orders WHERE supplier IS NOT NULL AND supplier != ""').fetchall()
        return jsonify([dict(row) for row in sups] if sups else [{'name': 'Proveedor General'}])
    finally:
        conn.close()


@app.route('/api/sales/my-sales', methods=['GET'])
@token_required
def get_my_sales():
    """Return sales for a specific user, ordered by date DESC, limit 50."""
    user_id = request.args.get('user_id')
    if not user_id:
        user_id = getattr(g, 'user_id', None)
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
    if str(g.user_id) != str(user_id) and getattr(g, 'user_role', '') != 'admin':
        return jsonify({'error': 'No tienes permisos para ver estas ventas'}), 403
    conn = get_db_connection()
    try:
        sales = conn.execute('''
            SELECT s.id, s.total, s.created_at, s.payment_method,
                   c.name as client_name
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.user_id = ? AND s.total > (SELECT COALESCE(SUM(total_refunded), 0) FROM returns r WHERE r.sale_id = s.id AND r.status IN ('Aprobado', 'Completado', 'approved'))
            ORDER BY s.created_at DESC
            LIMIT 50
        ''', (user_id,)).fetchall()

        result = []
        for sale in sales:
            s_dict = dict(sale)
            # Fetch sale items with product names
            items = conn.execute('''
                SELECT si.quantity, si.price, p.name as product_name, p.code as product_code
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = ?
            ''', (s_dict['id'],)).fetchall()
            s_dict['items'] = [dict(i) for i in items]
            result.append(s_dict)

        return jsonify(result)
    finally:
        conn.close()

@app.route('/api/sales/<int:id>', methods=['GET'])
@token_required
def get_sale_detail(id):
    """Return a single sale with its items and client info. Used for returns/refund lookup."""
    conn = get_db_connection()
    try:
        sale = conn.execute('''
            SELECT s.*, c.name as client_name, c.email as client_email,
                   c.phone as client_phone, c.ci_nit as client_ci
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.id = ?
        ''', (id,)).fetchone()

        if not sale:
            return jsonify({'error': 'Venta no encontrada'}), 404

        s_dict = dict(sale)
        s_dict['client'] = {
            'name': sale['client_name'],
            'email': sale['client_email'],
            'phone': sale['client_phone'],
            'ci_nit': sale['client_ci'],
        }

        items = conn.execute('''
            SELECT si.quantity, si.price, p.name as product_name, p.code as product_code, si.product_id
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
        ''', (id,)).fetchall()
        
        # Deduct already returned approved quantities
        returned_items = conn.execute('''
            SELECT ri.product_id, SUM(ri.quantity) as returned_qty 
            FROM return_items ri 
            JOIN returns r ON ri.return_id = r.id 
            WHERE r.sale_id = ? AND r.status IN ('Aprobado', 'Completado', 'approved')
            GROUP BY ri.product_id
        ''', (id,)).fetchall()
        
        returned_map = {row['product_id']: row['returned_qty'] for row in returned_items}
        
        filtered_items = []
        for i in items:
            i_dict = dict(i)
            returned = returned_map.get(i_dict['product_id'], 0)
            i_dict['quantity'] = max(0, i_dict['quantity'] - returned)
            if i_dict['quantity'] > 0:
                filtered_items.append(i_dict)
                
        s_dict['items'] = filtered_items

        return jsonify(s_dict)
    finally:
        conn.close()

@app.route('/api/reports/user_sales/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_user_sales_report(user_id):
    """Return sales statistics for a specific vendor."""
    conn = get_db_connection()
    try:
        stats = conn.execute('''
            SELECT COUNT(*) as total_count, COALESCE(SUM(total), 0) as total_revenue,
                   (SELECT COALESCE(SUM(total_refunded), 0) FROM returns r JOIN sales s2 ON r.sale_id = s2.id WHERE s2.user_id = ? AND r.status IN ('Aprobado', 'Completado', 'approved')) as total_refunds
            FROM sales WHERE user_id = ?
        ''', (user_id, user_id)).fetchone()

        sales = conn.execute('''
            SELECT s.id, s.total, s.created_at, c.name as client_name, s.payment_method 
            FROM sales s 
            LEFT JOIN clients c ON s.client_id = c.id 
            WHERE s.user_id = ? AND s.total > (SELECT COALESCE(SUM(total_refunded), 0) FROM returns r WHERE r.sale_id = s.id AND r.status IN ('Aprobado', 'Completado', 'approved'))
            ORDER BY s.created_at DESC LIMIT 50
        ''', (user_id,)).fetchall()

        return jsonify({
            'total_sales_count': stats['total_count'],
            'total_revenue': stats['total_revenue'],
            'total_refunds': stats['total_refunds'],
            'recent_sales': [dict(row) for row in sales]
        })
    finally:
        conn.close()


# --- Catch-all route for SPA frontend (must be LAST) ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

def backup_database():
    while True:
        try:
            base_dir = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else (os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd())
            db_path = os.path.join(base_dir, 'autoparts.db')
            if os.path.exists(db_path):
                backup_dir = os.path.join(base_dir, 'backups')
                if not os.path.exists(backup_dir):
                    os.makedirs(backup_dir)
                
                # Copy to backup folder with timestamp
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                backup_name = f"autoparts_backup_{timestamp}.db"
                shutil.copy2(db_path, os.path.join(backup_dir, backup_name))
                app.logger.info(f"Database backed up to {backup_name}")
                
                # Keep only last 30 backups
                backups = sorted([f for f in os.listdir(backup_dir) if f.startswith('autoparts_backup_')])
                if len(backups) > 30:
                    for old_backup in backups[:-30]:
                        try:
                            os.remove(os.path.join(backup_dir, old_backup))
                        except Exception:
                            pass
        except Exception as e:
            app.logger.error(f"Backup failed: {e}")
        
        # Sleep for 24 hours
        time.sleep(86400)

if __name__ == '__main__':
    # Start backup thread
    backup_thread = threading.Thread(target=backup_database, daemon=True)
    backup_thread.start()
    
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen or os.environ.get('FLASK_ENV') == 'production':
        try:
            from waitress import serve
            app.logger.info("Starting Waitress production server on port 5001")
            serve(app, host='0.0.0.0', port=5001)
        except ImportError:
            app.logger.warning("Waitress not installed. Falling back to Flask dev server.")
            app.run(host='0.0.0.0', port=5001)
    else:
        app.run(debug=True, host='0.0.0.0', port=5001)
