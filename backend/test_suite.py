import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:5000/api"
auth_token = None

def make_request(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
    if auth_token and endpoint not in ('/login', '/health'):
        headers['Authorization'] = f'Bearer {auth_token}'
    req_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode('utf-8')
            if res_data:
                return response.status, json.loads(res_data)
            return response.status, None
    except urllib.error.HTTPError as e:
        res_data = e.read().decode('utf-8')
        try:
            return e.code, json.loads(res_data)
        except:
            return e.code, res_data
    except Exception as e:
        return 500, str(e)

results = []

def run_test(name, fn):
    print(f"Running test: {name}...", end=" ")
    try:
        success, msg = fn()
        if success:
            print("✅ PASS")
            results.append({"section": name, "status": "PASS", "details": msg})
        else:
            print(f"❌ FAIL - {msg}")
            results.append({"section": name, "status": "FAIL", "details": msg})
    except Exception as e:
        print(f"⚠️ ERROR - {e}")
        results.append({"section": name, "status": "ERROR", "details": str(e)})

# 1. Auth Tests
def test_login_valid():
    global auth_token
    status, data = make_request('/login', 'POST', {'username': 'admin', 'password': 'admin123', 'role': 'admin'})
    if status == 200 and data.get('username') == 'admin':
        auth_token = data.get('token') # Guardar token JWT
        if not auth_token:
            return False, "Login successful but no token returned"
        return True, "Login successful and token received"
    return False, f"Status: {status}, Data: {data}"

def test_login_role_mismatch():
    status, data = make_request('/login', 'POST', {'username': 'admin', 'password': 'admin123', 'role': 'vendedor'})
    if status == 401 and 'Role mismatch' in str(data):
        return True, "Role mismatch rejected correctly"
    return False, f"Status: {status}, Data: {data}"

def test_login_invalid():
    status, data = make_request('/login', 'POST', {'username': 'admin', 'password': 'wrong'})
    if status == 401:
        return True, "Invalid login rejected as expected"
    return False, f"Status: {status}, Data: {data}"

# 2. Users Tests
def test_get_users():
    status, data = make_request('/users', 'GET')
    if status == 200 and isinstance(data, list):
        # check that almacenero is not among them
        for u in data:
            if u.get('role') == 'almacenero':
                return False, "Found almacenero in users list!"
        return True, f"Fetched {len(data)} users. No almacenero found."
    return False, f"Status: {status}, Data: {data}"

def test_create_user_invalid_role():
    user_data = {'username': 'testalmacen', 'name': 'Almacen', 'password': '123', 'role': 'almacenero'}
    status, data = make_request('/users', 'POST', user_data)
    if status == 400 and 'Rol inválido' in str(data):
        return True, "Rejected almacenero role correctly"
    return False, f"Status: {status}, Data: {data}"

# 3. Products
def test_get_products():
    status, data = make_request('/products', 'GET')
    if status == 200 and isinstance(data, list):
        return True, f"Fetched {len(data)} products"
    return False, f"Status: {status}, Data: {data}"

def test_create_product_invalid():
    # Price < 0
    prod_data = {
        'name': 'Bujia Error', 'brand': 'NGK', 'category': 'Motor', 'code': 'BUJ-ERR',
        'stock': 10, 'price': -5, 'min': 5
    }
    status, data = make_request('/products', 'POST', prod_data)
    if status == 400:
        return True, "Invalid product rejected as expected"
    return False, f"Status: {status}, Data: {data}"

# 4. Sales and Inventory Logic
def test_create_sale_inventory_sync():
    # 1. Create a product specifically for this test
    prod_data = {
        'name': 'Filtro Test', 'brand': 'Bosch', 'category': 'Motor', 'code': f'FILT-{int(time.time()*1000)}',
        'stock': 10, 'price': 50.0, 'min': 2
    }
    s1, d1 = make_request('/products', 'POST', prod_data)
    if s1 != 200:
        return False, "Failed to create test product"
    prod_id = d1['id']

    # 2. Make a sale of 3 units
    sale_data = {
        'user_id': 1, 'client_id': 1, 'payment_method': 'Efectivo', 'total': 150.0,
        'items': [{'id': prod_id, 'quantity': 3, 'price': 50.0}]
    }
    s2, d2 = make_request('/sales', 'POST', sale_data)
    if s2 != 200:
        return False, "Failed to create sale"
    
    # 3. Check stock is now 7
    s3, d3 = make_request('/products', 'GET')
    for p in d3:
        if p['id'] == prod_id:
            if p['stock'] == 7:
                # 4. Clean up
                make_request(f"/products/{prod_id}", 'DELETE')
                return True, "Sale created and stock correctly deduced from 10 to 7"
            else:
                return False, f"Stock was not updated correctly. Expected 7, got {p['stock']}"
    return False, "Test product not found after sale"

# 5. Purchase Orders
def test_purchase_order_flow():
    # 1. Create product with stock 0
    prod_data = {
        'name': 'Aceite Test', 'brand': 'Mobil', 'category': 'Motor', 'code': f'ACT-{int(time.time()*1000)}',
        'stock': 0, 'price': 100.0, 'min': 5
    }
    s1, d1 = make_request('/products', 'POST', prod_data)
    prod_id = d1['id']

    # 2. Create PO with item
    order_data = {'supplier': 'Test Supplier', 'total': 500.0, 'status': 'Borrador', 'items': [
        {'product_id': prod_id, 'quantity': 5, 'price': 100.0}
    ]}
    s2, d2 = make_request('/purchase-orders', 'POST', order_data)
    po_id = d2['id']

    # 3. Receive PO
    s3, d3 = make_request(f'/purchase-orders/{po_id}/status', 'PUT', {'status': 'Recibido'})
    
    # 4. Check stock is now 5
    s4, d4 = make_request('/products', 'GET')
    for p in d4:
        if p['id'] == prod_id:
            if p['stock'] == 5:
                make_request(f"/products/{prod_id}", 'DELETE')
                return True, "PO completed and stock correctly incremented"
            else:
                return False, f"Stock not updated correctly. Expected 5, got {p['stock']}"

# 6. Health & Security
def test_health():
    status, data = make_request('/health', 'GET')
    if status == 200 and data.get('status') == 'ok':
        return True, "Health check OK"
    return False, f"Status: {status}, Data: {data}"

def test_change_own_password():
    status, data = make_request('/users/me/password', 'PUT', {
        'current_password': 'admin123',
        'new_password': 'admin123'
    })
    if status == 200:
        return True, "Password change accepted"
    return False, f"Status: {status}, Data: {data}"

def test_delete_last_admin_blocked():
    status, data = make_request('/users', 'GET')
    if status != 200:
        return False, "Could not fetch users"
    admins = [u for u in data if u.get('role') == 'admin']
    if len(admins) != 1:
        return True, f"Omitido: hay {len(admins)} admins; la protección aplica con uno solo"
    admin_id = admins[0]['id']
    status, data = make_request(f'/users/{admin_id}', 'DELETE')
    if status == 400 and 'último administrador' in str(data):
        return True, "Last admin delete blocked correctly"
    return False, f"Status: {status}, Data: {data}"

# Run all tests
run_test("Auth: Login Valid", test_login_valid)
run_test("Auth: Role Mismatch", test_login_role_mismatch)
run_test("Auth: Login Invalid", test_login_invalid)
run_test("Users: Verify Almacenero removed", test_get_users)
run_test("Users: Reject Almacenero creation", test_create_user_invalid_role)
run_test("Products: Get List", test_get_products)
run_test("Products: Validation", test_create_product_invalid)
run_test("Sales: Full Cycle & Inventory Sync", test_create_sale_inventory_sync)
run_test("Orders: Full Cycle & Inventory Sync", test_purchase_order_flow)
run_test("System: Health Check", test_health)
run_test("Security: Change Own Password", test_change_own_password)
run_test("Security: Block Last Admin Delete", test_delete_last_admin_blocked)

# Save report
with open('test_results.json', 'w') as f:
    json.dump(results, f, indent=2)
print("\nDetailed Tests completed.")
