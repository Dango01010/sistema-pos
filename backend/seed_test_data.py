from database import get_db_connection
import random
from datetime import datetime, timedelta

def generate_test_data():
    """Generate comprehensive test data simulating 1 year of operations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    print("=" * 70)
    print("GENERATING COMPREHENSIVE TEST DATA - 1 YEAR SIMULATION")
    print("=" * 70)
    
    # ============================================
    # 1. USERS (15 users total)
    # ============================================
    print("\n[1/8] Creating users...")
    users = [
        # Admins
        ('admin', 'admin123', 'admin', 'Juan Administrador'),
        ('admin2', 'admin123', 'admin', 'Maria Gerente'),
        
        # Vendedores
        ('carlos.v', 'vendedor123', 'vendedor', 'Carlos Vendedor'),
        ('ana.v', 'vendedor123', 'vendedor', 'Ana Ventas'),
        ('pedro.v', 'vendedor123', 'vendedor', 'Pedro Sales'),
        ('lucia.v', 'vendedor123', 'vendedor', 'Lucia Comercial'),
        ('roberto.v', 'vendedor123', 'vendedor', 'Roberto Vendedor'),
        ('sofia.v', 'vendedor123', 'vendedor', 'Sofia Ventas'),
        
        # Almaceneros
        ('jose.a', 'almacen123', 'almacenero', 'Jose Almacen'),
        ('miguel.a', 'almacen123', 'almacenero', 'Miguel Bodega'),
        ('carmen.a', 'almacen123', 'almacenero', 'Carmen Inventario'),
        ('diego.a', 'almacen123', 'almacenero', 'Diego Stock'),
        ('laura.a', 'almacen123', 'almacenero', 'Laura Almacen'),
    ]
    
    cursor.executemany('INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)', users)
    print(f"   Created/verified {len(users)} users")
    
    # ============================================
    # 2. PRODUCTS (200+ products)
    # ============================================
    print("\n[2/8] Creating products...")
    
    # Product categories and brands
    categories = {
        'Motor': ['Bosch', 'NGK', 'Champion', 'Denso', 'ACDelco'],
        'Frenos': ['Brembo', 'ATE', 'TRW', 'Wagner', 'Akebono'],
        'Suspension': ['KYB', 'Monroe', 'Bilstein', 'Gabriel', 'Sachs'],
        'Filtros': ['Mann', 'Wix', 'Fram', 'Mahle', 'Hengst'],
        'Lubricantes': ['Shell', 'Mobil', 'Castrol', 'Valvoline', 'Pennzoil'],
        'Electrico': ['Bosch', 'Valeo', 'Hella', 'Magneti', 'Philips'],
        'Transmission': ['ZF', 'LuK', 'Sachs', 'Exedy', 'Aisin'],
        'Refrigeracion': ['Gates', 'Dayco', 'Continental', 'Mahle', 'Valeo'],
        'Escape': ['Walker', 'Bosal', 'Eberspacher', 'Starla', 'Magnaflow'],
        'Carroceria': ['Valeo', 'Magneti', 'TYC', 'Hella', 'Depo']
    }
    
    product_names = {
        'Motor': ['Bujias Iridium', 'Bujias Platino', 'Bobina Encendido', 'Sensor Oxigeno', 'Filtro Aire Motor'],
        'Frenos': ['Pastillas Delanteras', 'Pastillas Traseras', 'Discos Ventilados', 'Tambores', 'Liquido Frenos DOT4'],
        'Suspension': ['Amortiguador Delantero', 'Amortiguador Trasero', 'Resorte Espiral', 'Rotula Direccion', 'Terminal Direccion'],
        'Filtros': ['Filtro Aceite', 'Filtro Aire Cabina', 'Filtro Combustible', 'Filtro Aire Motor', 'Filtro Hidraulico'],
        'Lubricantes': ['Aceite 5W30', 'Aceite 10W40', 'Aceite 20W50', 'Aceite Caja', 'Grasa Multiuso'],
        'Electrico': ['Bateria 12V 60Ah', 'Bateria 12V 75Ah', 'Alternador', 'Motor Arranque', 'Faro Delantero'],
        'Transmission': ['Kit Embrague', 'Disco Embrague', 'Collarin', 'Volante Motor', 'Aceite ATF'],
        'Refrigeracion': ['Radiador', 'Termostato', 'Bomba Agua', 'Manguera Superior', 'Refrigerante'],
        'Escape': ['Silenciador', 'Tubo Escape', 'Convertidor Catalitico', 'Empaquetadura', 'Soporte Escape'],
        'Carroceria': ['Espejo Retrovisor', 'Faro Niebla', 'Parachoque', 'Capo', 'Guardafango']
    }
    
    products = []
    product_id = 1
    
    for category, brands in categories.items():
        for name_template in product_names[category]:
            for brand in brands:
                name = f"{name_template} {brand}"
                code = f"{category[:3].upper()}-{brand[:3].upper()}-{product_id:03d}"
                price = round(random.uniform(10, 300), 2)
                stock = random.randint(5, 150)
                min_stock = random.randint(5, 20)
                
                products.append((
                    name,
                    price,
                    stock,
                    min_stock,
                    category,
                    brand,
                    code,
                    f'https://images.unsplash.com/photo-{random.randint(1600000000000, 1700000000000)}?auto=format&fit=crop&q=80&w=200'
                ))
                product_id += 1
                
                # Limit to reasonable number
                if len(products) >= 250:
                    break
            if len(products) >= 250:
                break
        if len(products) >= 250:
            break
    
    cursor.executemany('''
        INSERT INTO products (name, price, stock, min_stock, category, brand, code, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', products)
    print(f"   Created {len(products)} products")
    
    # ============================================
    # 3. CLIENTS (150 clients)
    # ============================================
    print("\n[3/8] Creating clients...")
    
    first_names = ['Juan', 'Maria', 'Carlos', 'Ana', 'Pedro', 'Lucia', 'Jose', 'Carmen', 'Miguel', 'Sofia',
                   'Diego', 'Laura', 'Roberto', 'Isabel', 'Antonio', 'Elena', 'Manuel', 'Rosa', 'Francisco', 'Patricia']
    last_names = ['Garcia', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 
                  'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Morales', 'Reyes', 'Gutierrez']
    
    clients = []
    for i in range(150):
        first = random.choice(first_names)
        last = random.choice(last_names)
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower()}{random.randint(1, 999)}@email.com"
        phone = f"+591 {random.randint(60000000, 79999999)}"
        ci_nit = f"{random.randint(1000000, 9999999)}"
        loyalty_points = random.randint(0, 500)
        
        clients.append((name, email, phone, ci_nit, loyalty_points))
    
    cursor.executemany('''
        INSERT INTO clients (name, email, phone, ci_nit, loyalty_points)
        VALUES (?, ?, ?, ?, ?)
    ''', clients)
    print(f"   Created {len(clients)} clients")
    
    # Get client IDs
    client_ids = [row[0] for row in cursor.execute('SELECT id FROM clients').fetchall()]
    
    # ============================================
    # 4. SALES (800+ sales over 1 year)
    # ============================================
    print("\n[4/8] Creating sales transactions...")
    
    # Get user IDs for vendedores
    vendedor_ids = [row[0] for row in cursor.execute("SELECT id FROM users WHERE role='vendedor'").fetchall()]
    product_data = cursor.execute('SELECT id, price, stock FROM products').fetchall()
    
    # Generate dates spread over 1 year
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    sales_count = 0
    for _ in range(850):
        # Random date in the past year
        days_ago = random.randint(0, 365)
        sale_date = end_date - timedelta(days=days_ago)
        sale_date_str = sale_date.strftime('%Y-%m-%d %H:%M:%S')
        
        # Random client and seller
        client_id = random.choice(client_ids)
        user_id = random.choice(vendedor_ids)
        
        # Random number of items per sale (1-5)
        num_items = random.randint(1, 5)
        sale_items = random.sample(product_data, min(num_items, len(product_data)))
        
        # Calculate total
        total = 0
        items_data = []
        for product_id, price, stock in sale_items:
            if stock > 0:
                quantity = random.randint(1, min(3, stock))
                item_total = price * quantity
                total += item_total
                items_data.append((product_id, quantity, price))
        
        if items_data:  # Only create sale if we have items
            # Create sale
            cursor.execute('''
                INSERT INTO sales (total, user_id, client_id, created_at, payment_method)
                VALUES (?, ?, ?, ?, ?)
            ''', (total, user_id, client_id, sale_date_str, random.choice(['Efectivo', 'Tarjeta', 'Transferencia'])))
            
            sale_id = cursor.lastrowid
            
            # Add sale items and update stock
            for product_id, quantity, price in items_data:
                cursor.execute('''
                    INSERT INTO sale_items (sale_id, product_id, quantity, price)
                    VALUES (?, ?, ?, ?)
                ''', (sale_id, product_id, quantity, price))
                
                # Update stock
                cursor.execute('UPDATE products SET stock = stock - ? WHERE id = ?', (quantity, product_id))
            
            sales_count += 1
    
    print(f"   Created {sales_count} sales transactions")
    
    # ============================================
    # 5. TRANSFERS (50 transfers)
    # ============================================
    print("\n[5/8] Creating inventory transfers...")
    
    locations = ['Almacen Central', 'Sucursal Norte', 'Sucursal Sur', 'Sucursal Este', 'Sucursal Oeste', 'Bodega Principal']
    statuses = ['Pendiente', 'En Proceso', 'Completado']
    
    for i in range(50):
        days_ago = random.randint(0, 365)
        transfer_date = (end_date - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        
        origin = random.choice(locations)
        destination = random.choice([loc for loc in locations if loc != origin])
        status = random.choice(statuses)
        notes = f"Transferencia {random.choice(['automatica', 'manual', 'de emergencia', 'programada'])}"
        
        cursor.execute('''
            INSERT INTO transfers (origin, destination, status, date, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (origin, destination, status, transfer_date, notes, transfer_date))
        
        transfer_id = cursor.lastrowid
        
        # Add 2-5 random products to transfer
        num_products = random.randint(2, 5)
        transfer_products = random.sample(product_data[:100], num_products)
        
        for product_id, _, stock in transfer_products:
            if stock > 0:
                quantity = random.randint(1, min(10, stock))
                cursor.execute('''
                    INSERT INTO transfer_items (transfer_id, product_id, quantity)
                    VALUES (?, ?, ?)
                ''', (transfer_id, product_id, quantity))
    
    print(f"   Created 50 inventory transfers")
    
    # ============================================
    # 6. PURCHASE ORDERS (30 orders)
    # ============================================
    print("\n[6/8] Creating purchase orders...")
    
    suppliers = ['AutoParts Global Inc', 'Repuestos Premium SA', 'Importadora Martinez', 
                 'Distribuidora Continental', 'Bosch Official', 'NGK Distributor',
                 'Brembo Parts', 'Shell Lubricants', 'Proveedora Nacional']
    
    for i in range(30):
        days_ago = random.randint(0, 365)
        po_date = (end_date - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        
        supplier = random.choice(suppliers)
        total = round(random.uniform(1000, 50000), 2)
        status = random.choice(['Borrador', 'En Transito', 'Recibido'])
        
        cursor.execute('''
            INSERT INTO purchase_orders (supplier, total, status, created_at)
            VALUES (?, ?, ?, ?)
        ''', (supplier, total, status, po_date))
    
    print(f"   Created 30 purchase orders")
    
    # ============================================
    # 7. QUOTATIONS (40 quotations)
    # ============================================
    print("\n[7/8] Creating quotations...")
    
    for i in range(40):
        days_ago = random.randint(0, 180)  # Last 6 months
        quote_date = (end_date - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        
        client_id = random.choice(client_ids)
        
        # Random products for quote
        num_items = random.randint(1, 4)
        quote_products = random.sample(product_data[:100], num_items)
        
        total = 0
        items_data = []
        for product_id, price, _ in quote_products:
            quantity = random.randint(1, 5)
            item_total = price * quantity
            total += item_total
            items_data.append((product_id, quantity, price))
        
        status = random.choice(['pending', 'accepted', 'rejected'])
        
        cursor.execute('''
            INSERT INTO quotations (client_id, total, status, created_at)
            VALUES (?, ?, ?, ?)
        ''', (client_id, total, status, quote_date))
        
        quotation_id = cursor.lastrowid
        
        # Add quotation items
        for product_id, quantity, price in items_data:
            cursor.execute('''
                INSERT INTO quotation_items (quotation_id, product_id, quantity, price)
                VALUES (?, ?, ?, ?)
            ''', (quotation_id, product_id, quantity, price))
    
    print(f"   Created 40 quotations")
    
    # ============================================
    # 8. RETURNS (20 returns/RMA)
    # ============================================
    print("\n[8/8] Creating returns/RMA...")
    
    # Get some recent sales
    recent_sales = cursor.execute('''
        SELECT id FROM sales 
        ORDER BY created_at DESC 
        LIMIT 50
    ''').fetchall()
    
    reasons = [
        'Producto defectuoso',
        'Pieza incorrecta',
        'Dano en transporte',
        'No compatible con vehiculo',
        'Cliente insatisfecho',
        'Error en pedido'
    ]
    
    for i in range(20):
        if not recent_sales:
            break
            
        sale_id = random.choice(recent_sales)[0]
        
        # Get sale items
        sale_items_data = cursor.execute('''
            SELECT product_id, quantity, price 
            FROM sale_items 
            WHERE sale_id = ?
        ''', (sale_id,)).fetchall()
        
        if not sale_items_data:
            continue
        
        # Return 1-2 items from the sale
        num_returns = min(random.randint(1, 2), len(sale_items_data))
        return_items = random.sample(sale_items_data, num_returns)
        
        total_refund = 0
        return_items_data = []
        
        for product_id, quantity, price in return_items:
            return_qty = random.randint(1, quantity)
            refund_amount = price * return_qty
            total_refund += refund_amount
            return_items_data.append((product_id, return_qty))
        
        reason = random.choice(reasons)
        status = random.choice(['pending', 'approved', 'rejected'])
        
        days_ago = random.randint(0, 90)
        return_date = (end_date - timedelta(days=days_ago)).strftime('%Y-%m-%d %H:%M:%S')
        
        cursor.execute('''
            INSERT INTO returns (sale_id, reason, total_refunded, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (sale_id, reason, total_refund, status, return_date))
        
        return_id = cursor.lastrowid
        
        # Add return items and restock if approved
        for product_id, return_qty in return_items_data:
            cursor.execute('''
                INSERT INTO return_items (return_id, product_id, quantity)
                VALUES (?, ?, ?)
            ''', (return_id, product_id, return_qty))
            
            # Restock if approved
            if status == 'approved':
                cursor.execute('UPDATE products SET stock = stock + ? WHERE id = ?', (return_qty, product_id))
    
    print(f"   Created 20 returns/RMA")
    
    # ============================================
    # COMMIT AND FINISH
    # ============================================
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 70)
    print("DATABASE POPULATION COMPLETE!")
    print("=" * 70)
    print("\nSummary:")
    print(f"  Users: 13")
    print(f"  Products: {len(products)}")
    print(f"  Clients: 150")
    print(f"  Sales: {sales_count}")
    print(f"  Transfers: 50")
    print(f"  Purchase Orders: 30")
    print(f"  Quotations: 40")
    print(f"  Returns: 20")
    print("\nYour database now simulates 1 year of business operations!")
    print("Ready for comprehensive testing.\n")

if __name__ == '__main__':
    print("\nThis will populate the database with extensive test data.")
    print("Simulating 1 year of business operations...\n")
    
    response = input("Continue? (type 'YES' to confirm): ")
    
    if response == 'YES':
        generate_test_data()
    else:
        print("\nOperation cancelled.")
