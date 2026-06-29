import requests
import json

BASE_URL = "http://127.0.0.1:5001/api"

def run_tests():
    results = []
    
    # 1. Login
    try:
        r = requests.post(f"{BASE_URL}/login", json={"username": "carlos.v", "password": "vendedor123"})
        if r.status_code == 200:
            token = r.json().get('token')
            results.append({"endpoint": "/api/login", "status": r.status_code, "success": True, "note": "Login successful"})
        else:
            results.append({"endpoint": "/api/login", "status": r.status_code, "success": False, "note": "Login failed"})
            token = None
    except Exception as e:
        results.append({"endpoint": "/api/login", "status": "ERROR", "success": False, "note": str(e)})
        token = None
        
    if not token:
        with open("seller_report.json", "w") as f:
            json.dump(results, f, indent=2)
        return
        
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 2. Fetch Products
    try:
        r = requests.get(f"{BASE_URL}/products", headers=headers)
        success = r.status_code == 200 and isinstance(r.json(), list)
        results.append({"endpoint": "GET /api/products", "status": r.status_code, "success": success, "note": f"Found {len(r.json())} products" if success else r.text[:100]})
        products = r.json() if success else []
    except Exception as e:
        results.append({"endpoint": "GET /api/products", "status": "ERROR", "success": False, "note": str(e)})
        products = []
        
    # 3. Create Quotation
    if products:
        prod = products[0]
        try:
            quot_data = {
                "client_name": "Test Client",
                "client_nit": "1234567",
                "items": [{"product_id": prod['id'], "quantity": 1, "price": prod['price'], "subtotal": prod['price']}],
                "total": prod['price'],
                "notes": "Test quotation"
            }
            r = requests.post(f"{BASE_URL}/quotations", headers=headers, json=quot_data)
            results.append({"endpoint": "POST /api/quotations", "status": r.status_code, "success": r.status_code in [200, 201], "note": "Quotation created"})
        except Exception as e:
            results.append({"endpoint": "POST /api/quotations", "status": "ERROR", "success": False, "note": str(e)})

    # 4. Make a Sale
    if products:
        prod = products[0]
        try:
            sale_data = {
                "client_name": "Test Client Sale",
                "client_nit": "1234567",
                "items": [{"product_id": prod['id'], "quantity": 1, "price": prod['price'], "subtotal": prod['price']}],
                "total": prod['price'],
                "discount": 0
            }
            r = requests.post(f"{BASE_URL}/sales", headers=headers, json=sale_data)
            results.append({"endpoint": "POST /api/sales", "status": r.status_code, "success": r.status_code in [200, 201], "note": "Sale created"})
        except Exception as e:
            results.append({"endpoint": "POST /api/sales", "status": "ERROR", "success": False, "note": str(e)})

    # 5. Get Sales History
    try:
        r = requests.get(f"{BASE_URL}/sales/my-sales", headers=headers)
        if r.status_code == 200:
            results.append({"endpoint": "GET /api/sales/my-sales", "status": r.status_code, "success": True, "note": f"Found {len(r.json())} sales"})
        else:
            results.append({"endpoint": "GET /api/sales/my-sales", "status": r.status_code, "success": False, "note": r.text[:100]})
    except Exception as e:
        results.append({"endpoint": "GET /api/sales/my-sales", "status": "ERROR", "success": False, "note": str(e)})

    with open("seller_report.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
