import urllib.request
import urllib.parse
import json
import time

BASE_URL = 'http://localhost:5000/api'

def fetch_products():
    req = urllib.request.Request(f'{BASE_URL}/products', method='GET')
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def send_sale(payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'{BASE_URL}/sales', data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 500, {'error': str(e)}

def main():
    print("Starting Sales Simulation...")
    initial_products = fetch_products()
    if not initial_products:
        print("No products found to test with.")
        return

    # Filter out products with negative stock for our valid tests, just in case
    available_products = [p for p in initial_products if p.get('stock', 0) > 0]
    if not available_products:
        print("No products with positive stock found.")
        return
    
    p1 = available_products[0]
    p2 = available_products[1] if len(available_products) > 1 else p1

    scenarios = [
        # Valid Scenarios
        {"desc": "Valid single item sale (Efectivo)", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": p1['price']}], "total": p1['price'], "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 200},
        {"desc": "Valid multi-item sale (Tarjeta)", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": p1['price']}, {"id": p2['id'], "quantity": 2, "price": p2['price']}], "total": p1['price'] + p2['price']*2, "user_id": 1, "client_id": 1, "payment_method": "Tarjeta"}, "expect": 200},
        {"desc": "Valid sale (Transferencia)", "payload": {"items": [{"id": p2['id'], "quantity": 1, "price": p2['price']}], "total": p2['price'], "user_id": 1, "client_id": 1, "payment_method": "Transferencia"}, "expect": 200},
        
        # Invalid Scenarios - Missing or Empty Fields
        {"desc": "Invalid sale - Missing items", "payload": {"total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Empty items list", "payload": {"items": [], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Negative total", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": p1['price']}], "total": -100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Zero total", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": p1['price']}], "total": 0, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Missing total", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": p1['price']}], "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        
        # Invalid Scenarios - Quantities
        {"desc": "Invalid sale - Zero quantity", "payload": {"items": [{"id": p1['id'], "quantity": 0, "price": p1['price']}], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Negative quantity", "payload": {"items": [{"id": p1['id'], "quantity": -5, "price": p1['price']}], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Non-integer quantity", "payload": {"items": [{"id": p1['id'], "quantity": "abc", "price": p1['price']}], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        
        # Invalid Scenarios - Price
        {"desc": "Invalid sale - Missing price", "payload": {"items": [{"id": p1['id'], "quantity": 1}], "total": p1['price'], "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        {"desc": "Invalid sale - Negative price", "payload": {"items": [{"id": p1['id'], "quantity": 1, "price": -10}], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
        
        # Invalid Scenarios - ID
        {"desc": "Invalid sale - Non-existent product", "payload": {"items": [{"id": 999999, "quantity": 1, "price": 100}], "total": 100, "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},

        # Invalid Scenarios - Stock limit
        {"desc": "Invalid sale - Exceeds stock limits", "payload": {"items": [{"id": p1['id'], "quantity": p1['stock'] + 10, "price": p1['price']}], "total": (p1['stock'] + 10) * p1['price'], "user_id": 1, "client_id": 1, "payment_method": "Efectivo"}, "expect": 400},
    ]

    # Add more to reach 20
    for i in range(6):
        # alternate products to avoid running out of stock easily
        pad_product = available_products[i % len(available_products)]
        scenarios.append({
            "desc": f"Valid sale padding #{i+1}",
            "payload": {"items": [{"id": pad_product['id'], "quantity": 1, "price": pad_product['price']}], "total": pad_product['price'], "user_id": 1, "client_id": 1, "payment_method": "Efectivo"},
            "expect": 200
        })

    bugs = []
    
    current_products = {p['id']: p for p in initial_products}

    for i, scenario in enumerate(scenarios):
        print(f"--- Test {i+1}: {scenario['desc']} ---")
        status, response = send_sale(scenario['payload'])
        print(f"Status: {status}, Response: {response}")
        
        if status != scenario['expect']:
            bug = f"Bug in '{scenario['desc']}': Expected {scenario['expect']} but got {status}. Response: {response}"
            print(bug)
            bugs.append(bug)
        
        # If the sale was successful, we should verify stock was subtracted correctly
        if status == 200:
            updated_products = {p['id']: p for p in fetch_products()}
            
            # Only verify if we expected it to be 200, otherwise it's a bug we already reported
            if scenario['expect'] == 200:
                for item in scenario['payload'].get('items', []):
                    pid = item.get('id')
                    qty = int(item.get('quantity', 0))
                    if pid in current_products and pid in updated_products:
                        expected_stock = current_products[pid]['stock'] - qty
                        actual_stock = updated_products[pid]['stock']
                        if actual_stock != expected_stock:
                            bug = f"Bug in Stock Subtraction for '{scenario['desc']}': Product {pid} expected stock {expected_stock}, but got {actual_stock}"
                            print(bug)
                            bugs.append(bug)
            
            # Always update our tracker if a sale went through (even unexpectedly)
            current_products = updated_products

        time.sleep(0.1) # Small delay to avoid overwhelming the server

    print("\n=== Simulation Complete ===")
    if bugs:
        print("Flaws/Bugs Found:")
        for b in bugs:
            print("-", b)
    else:
        print("No bugs found. Backend works perfectly!")

if __name__ == '__main__':
    main()
