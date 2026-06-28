from database import init_db, get_db_connection

def seed_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    from werkzeug.security import generate_password_hash
    # Users
    users = [
        ('admin', generate_password_hash('admin_secure123'), 'admin', 'Administrador Principal'),
        ('vendedor', generate_password_hash('vendedor123'), 'vendedor', 'Juan Vendedor')
    ]
    cursor.executemany('INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', users)

    # Products (Adding Brand and Min Stock)
    products = [
        ('Filtro Aceite Premium', 15.99, 45, 10, 'Mantenimiento', 'Wix', 'WIX-001', 'https://images.unsplash.com/photo-1635784063251-c0e86b24538e?auto=format&fit=crop&q=80&w=200'),
        ('Kit Pastillas Freno', 45.50, 23, 15, 'Frenos', 'Brembo', 'BRE-001', 'https://images.unsplash.com/photo-1626435016252-f6727284725d?auto=format&fit=crop&q=80&w=200'),
        ('Bujías Iridium NGK', 8.99, 67, 20, 'Motor', 'NGK', 'NGK-001', 'https://images.unsplash.com/photo-1632524458872-9c7161823901?auto=format&fit=crop&q=80&w=200'),
        ('Aceite Sintético 5W30', 25.99, 34, 15, 'Lubricantes', 'Shell', 'SHE-001', 'https://images.unsplash.com/photo-1579895101292-23f27f05026c?auto=format&fit=crop&q=80&w=200'),
        ('Batería 12V 60Ah', 120.00, 8, 5, 'Eléctrico', 'Bosch', 'BOS-005', 'https://images.unsplash.com/photo-1616788494707-ec28f1e913a0?auto=format&fit=crop&q=80&w=200'),
        ('Amortiguador Delantero', 85.00, 12, 4, 'Suspensión', 'KYB', 'KYB-002', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200')
    ]
    cursor.executemany('INSERT OR IGNORE INTO products (name, price, stock, min_stock, category, brand, code, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', products)
    
    # Sample Transfer
    transfer_data = ('Almacén Central', 'Sucursal Norte', 'Pendiente', '2025-12-22', 'Reposición automática')
    cursor.execute('INSERT INTO transfers (origin, destination, status, date, notes) VALUES (?, ?, ?, ?, ?)', transfer_data)
    transfer_id = cursor.lastrowid
    cursor.execute('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)', (transfer_id, 1, 10))
    cursor.execute('INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)', (transfer_id, 2, 5))

    # Sample Purchase Orders
    po_data = [
        ('AutoParts Global', 12450.00, 'En Tránsito'),
        ('Brembo Official', 4200.00, 'Borrador'),
        ('Bosch Systems', 8900.00, 'Recibido')
    ]
    cursor.executemany('INSERT INTO purchase_orders (supplier, total, status) VALUES (?, ?, ?)', po_data)

    # Sample Returns (RMA)
    # We need a sale first for returns to link to
    cursor.execute('INSERT INTO clients (name) VALUES (?)', ('Cliente General',))
    client_id = cursor.lastrowid
    cursor.execute('INSERT INTO sales (total, user_id, client_id) VALUES (?, ?, ?)', (500.0, 1, client_id))
    sale_id = cursor.lastrowid
    
    returns_data = [
        (sale_id, 'Daño de fábrica', 150.0, 'pending'),
        (sale_id, 'Envío Incorrecto', 45.0, 'pending')
    ]
    cursor.executemany('INSERT INTO returns (sale_id, reason, total_refunded, status) VALUES (?, ?, ?, ?)', returns_data)

    conn.commit()
    conn.close()
    print("Database initialized and seeded.")

if __name__ == '__main__':
    init_db()
    seed_data()
