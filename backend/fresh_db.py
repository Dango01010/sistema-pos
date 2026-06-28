from database import init_db, get_db_connection

def clear_all_data():
    """Clear all data from all tables while keeping the schema"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("Clearing all data from database...")
    
    # Disable foreign key constraints temporarily
    cursor.execute('PRAGMA foreign_keys = OFF')
    
    # Delete all data from all tables
    tables = [
        'return_items',
        'returns',
        'quotation_items',
        'quotations',
        'sale_items',
        'sales',
        'transfer_items',
        'transfers',
        'purchase_order_items',
        'purchase_orders',
        'products',
        'clients',
        'users'
    ]
    
    for table in tables:
        cursor.execute(f'DELETE FROM {table}')
        print(f"   OK Cleared {table}")
    
    # Reset autoincrement counters
    cursor.execute('DELETE FROM sqlite_sequence')
    print(f"   OK Reset auto-increment counters")
    
    # Re-enable foreign key constraints
    cursor.execute('PRAGMA foreign_keys = ON')
    
    conn.commit()
    print("\nAll data cleared successfully!")
    return conn, cursor

def create_admin_user():
    """Create a single admin user for initial access"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("\nCreating initial admin user...")
    
    from werkzeug.security import generate_password_hash
    hashed_pw = generate_password_hash('admin123')
    # Create admin user
    cursor.execute(
        'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
        ('admin', hashed_pw, 'admin', 'Administrador Principal')
    )
    
    conn.commit()
    conn.close()
    
    print("   OK Admin user created")
    print("      Username: admin")
    print("      Password: admin123")
    print("\nIMPORTANT: Change this password after first login!")

def fresh_database():
    """Create a fresh database with schema and minimal data"""
    print("=" * 60)
    print("CREATING FRESH DATABASE")
    print("=" * 60)
    
    # Reinitialize schema
    print("\nReinitializing database schema...")
    init_db()
    print("   OK Schema created")
    
    # Clear any existing data
    conn, cursor = clear_all_data()
    conn.close()
    
    # Create admin user
    create_admin_user()
    
    print("\n" + "=" * 60)
    print("DATABASE IS NOW CLEAN AND READY FOR PRODUCTION DATA!")
    print("=" * 60)
    print("\nNext steps:")
    print("   1. Restart your Flask backend: python backend/app.py")
    print("   2. Login with admin/admin123")
    print("   3. Start adding your real products and users")
    print("   4. Change the admin password immediately!")
    print()

if __name__ == '__main__':
    # Ask for confirmation
    print("\nWARNING: This will DELETE ALL DATA from the database!")
    print("This action cannot be undone.\n")
    
    response = input("Are you sure you want to continue? (type 'YES' to confirm): ")
    
    if response == 'YES':
        fresh_database()
    else:
        print("\nOperation cancelled. No changes were made.")
