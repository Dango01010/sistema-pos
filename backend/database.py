import sqlite3
import os
import sys

if getattr(sys, 'frozen', False):
    DATABASE = os.path.join(os.path.dirname(sys.executable), 'autoparts.db')
    schema_base = sys._MEIPASS
else:
    DATABASE = os.path.join(os.path.dirname(__file__), 'autoparts.db')
    schema_base = os.path.dirname(__file__)

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.execute('PRAGMA journal_mode = WAL')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    schema_path = os.path.join(schema_base, 'schema.sql')
    with open(schema_path) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()

def run_migrations():
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(clients)")
        columns_clients = [info[1] for info in cur.fetchall()]
        if 'ci_nit' not in columns_clients:
            cur.execute("ALTER TABLE clients ADD COLUMN ci_nit TEXT")
            
        cur.execute("PRAGMA table_info(returns)")
        columns_returns = [info[1] for info in cur.fetchall()]
        if 'description' not in columns_returns:
            cur.execute("ALTER TABLE returns ADD COLUMN description TEXT")
        if 'evidence_images' not in columns_returns:
            cur.execute("ALTER TABLE returns ADD COLUMN evidence_images TEXT")

        cur.execute("PRAGMA table_info(quotations)")
        columns_quotations = [info[1] for info in cur.fetchall()]
        if 'origin' not in columns_quotations:
            cur.execute("ALTER TABLE quotations ADD COLUMN origin TEXT")
        if 'delivery_date' not in columns_quotations:
            cur.execute("ALTER TABLE quotations ADD COLUMN delivery_date TEXT")
        if 'validity_date' not in columns_quotations:
            cur.execute("ALTER TABLE quotations ADD COLUMN validity_date TEXT")
        if 'payment_type' not in columns_quotations:
            cur.execute("ALTER TABLE quotations ADD COLUMN payment_type TEXT")
            
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
        if not cur.fetchone():
            cur.execute('''
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE
                )
            ''')
            cur.execute('''
                INSERT OR IGNORE INTO categories (name)
                SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''
            ''')
            
        conn.commit()
    finally:
        conn.close()

def bootstrap_admin():
    from werkzeug.security import generate_password_hash
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cur.fetchone():
            count = conn.execute('SELECT COUNT(*) as c FROM users').fetchone()['c']
            if count == 0:
                conn.execute(
                    'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
                    ('admin', generate_password_hash('admin123'), 'admin', 'Administrador Principal')
                )
                conn.commit()
    finally:
        conn.close()

def ensure_database():
    created = False
    if not os.path.exists(DATABASE) or os.path.getsize(DATABASE) == 0:
        init_db()
        created = True
    run_migrations()
    bootstrap_admin()
    return created
