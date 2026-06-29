import requests
import json
import random

BASE_URL = "http://127.0.0.1:5001/api"

def run_tests():
    results = []
    
    # 1. Login
    try:
        r = requests.post(f"{BASE_URL}/login", json={"username": "admin", "password": "admin123"})
        if r.status_code == 200:
            token = r.json().get('token')
            results.append({"endpoint": "/api/login", "status": r.status_code, "success": True, "note": "Admin login successful"})
        else:
            results.append({"endpoint": "/api/login", "status": r.status_code, "success": False, "note": "Admin login failed"})
            token = None
    except Exception as e:
        results.append({"endpoint": "/api/login", "status": "ERROR", "success": False, "note": str(e)})
        token = None
        
    if not token:
        with open("admin_report.json", "w") as f:
            json.dump(results, f, indent=2)
        return
        
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # 2. Test Dashboard Stats
    try:
        r = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
        success = r.status_code == 200
        results.append({"endpoint": "GET /api/dashboard/stats", "status": r.status_code, "success": success, "note": "Dashboard stats retrieved" if success else r.text[:100]})
    except Exception as e:
        results.append({"endpoint": "GET /api/dashboard/stats", "status": "ERROR", "success": False, "note": str(e)})

    # 3. Test Users List
    try:
        r = requests.get(f"{BASE_URL}/users", headers=headers)
        success = r.status_code == 200 and isinstance(r.json(), list)
        results.append({"endpoint": "GET /api/users", "status": r.status_code, "success": success, "note": f"Found {len(r.json())} users" if success else r.text[:100]})
    except Exception as e:
        results.append({"endpoint": "GET /api/users", "status": "ERROR", "success": False, "note": str(e)})

    # 4. Test Create Product
    prod_id = None
    try:
        new_prod = {
            "name": f"Test Product {random.randint(1000, 9999)}",
            "brand": "TestBrand",
            "code": f"TST-{random.randint(1000, 9999)}",
            "category": "Filtros",
            "stock": 10,
            "price": 150.00,
            "min": 2
        }
        r = requests.post(f"{BASE_URL}/products", headers=headers, json=new_prod)
        if r.status_code in [200, 201]:
            results.append({"endpoint": "POST /api/products", "status": r.status_code, "success": True, "note": "Product created successfully"})
            prod_id = r.json().get('id')
        else:
            results.append({"endpoint": "POST /api/products", "status": r.status_code, "success": False, "note": r.text[:100]})
    except Exception as e:
        results.append({"endpoint": "POST /api/products", "status": "ERROR", "success": False, "note": str(e)})

    # 5. Delete the Product
    if prod_id:
        try:
            r = requests.delete(f"{BASE_URL}/products/{prod_id}", headers=headers)
            results.append({"endpoint": f"DELETE /api/products/{prod_id}", "status": r.status_code, "success": r.status_code in [200, 204], "note": "Product deleted successfully"})
        except Exception as e:
            results.append({"endpoint": f"DELETE /api/products/{prod_id}", "status": "ERROR", "success": False, "note": str(e)})

    # 6. Test Reports
    try:
        r = requests.get(f"{BASE_URL}/reports/sales", headers=headers)
        success = r.status_code == 200
        results.append({"endpoint": "GET /api/reports/sales", "status": r.status_code, "success": success, "note": "Reports retrieved" if success else r.text[:100]})
    except Exception as e:
        results.append({"endpoint": "GET /api/reports/sales", "status": "ERROR", "success": False, "note": str(e)})

    with open("admin_report.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_tests()
