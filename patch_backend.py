import sqlite3
import re

def update_file(filename):
    with open(filename, 'r') as f:
        content = f.read()

    # Update get_reports_stats
    stats_replacement = """def get_reports_stats():
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
        conn.close()"""
    content = re.sub(r'def get_reports_stats\(\):.*?finally:\n\s+conn\.close\(\)', stats_replacement, content, flags=re.DOTALL)

    # Update get_sales_report
    sales_replacement = """def get_sales_report():
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
        conn.close()"""
    content = re.sub(r'def get_sales_report\(\):.*?finally:\n\s+conn\.close\(\)', sales_replacement, content, flags=re.DOTALL)

    # Update get_sales_by_category
    cat_replacement = """def get_sales_by_category():
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
        conn.close()"""
    content = re.sub(r'def get_sales_by_category\(\):.*?finally:\n\s+conn\.close\(\)', cat_replacement, content, flags=re.DOTALL)

    # Update get_returns
    returns_replacement = """def get_returns():
    conn = get_db_connection()
    try:
        vendor = request.args.get('vendor', 'All')
        
        query = '''
            SELECT r.id, r.reason, r.total_refunded as total, r.status, r.created_at as date,
                   r.description, r.evidence_images,
                   COALESCE(c.name, 'Cliente General') as client, s.payment_method as invoice,
                   u.name as vendor_name
            FROM returns r
            JOIN sales s ON r.sale_id = s.id
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN users u ON s.user_id = u.id
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
        conn.close()"""
    content = re.sub(r'def get_returns\(\):.*?finally:\n\s+conn\.close\(\)', returns_replacement, content, flags=re.DOTALL)

    # Update get_users to be used for finding sellers, oh wait we can just extract sellers from frontend or add an endpoint for sellers.
    # Actually wait, there is already an endpoint for users: /api/users
    
    with open(filename, 'w') as f:
        f.write(content)

update_file('backend/app.py')
print("Successfully patched app.py")
