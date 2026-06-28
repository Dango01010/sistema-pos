import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:5000/api"

def make_request(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}
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
        if res_data:
            try:
                return e.code, json.loads(res_data)
            except:
                pass
        return e.code, None

def run_test(name, func):
    print(f"Running test: {name}...", end=" ")
    try:
        success, message = func()
        if success:
            print("✅ PASS")
        else:
            print(f"❌ FAIL - {message}")
    except Exception as e:
        print(f"⚠️ ERROR - {str(e)}")

def test_clients():
    s, d = make_request('/clients', 'POST', {'name': 'Cliente Test', 'email': 'test@test.com'})
    if s == 200 and 'success' in d:
        return True, "Client created"
    return False, "Failed to create client"

def test_transfers():
    # 1. Create product
    prod_data = {'name': 'Bujia Test', 'brand': 'NGK', 'category': 'Motor', 'code': f'BUJ-{int(time.time()*1000)}', 'stock': 10, 'price': 20.0, 'min': 2}
    s1, d1 = make_request('/products', 'POST', prod_data)
    prod_id = d1['id']

    # 2. Create transfer
    t_data = {'origin': 'Bodega', 'destination': 'Tienda', 'date': '2026-06-23', 'notes': 'Test transfer', 'items': [{'id': prod_id, 'quantity': 2}]}
    s2, d2 = make_request('/transfers', 'POST', t_data)
    t_id = d2['id']

    # 3. Complete transfer
    s3, d3 = make_request(f'/transfers/{t_id}/status', 'PUT', {'status': 'Completado'})
    
    # 4. Check stock
    s4, d4 = make_request('/products', 'GET')
    for p in d4:
        if p['id'] == prod_id:
            if p['stock'] == 8:
                return True, "Transfer completed and stock deduced"
            else:
                return False, f"Stock mismatch, expected 8 got {p['stock']}"
    return False, "Product not found"

def test_low_stock():
    s, d = make_request('/inventory/low-stock', 'GET')
    if s == 200 and isinstance(d, list):
        return True, "Low stock endpoint working"
    return False, "Low stock endpoint failed"

run_test("Clients: Create Client", test_clients)
run_test("Transfers: Stock Sync", test_transfers)
run_test("Inventory: Low Stock Endpoint", test_low_stock)
