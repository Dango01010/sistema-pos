import urllib.request
import json

BASE_URL = 'http://localhost:5000/api'

def get_json(url):
    req = urllib.request.Request(url, method='GET')
    with urllib.request.urlopen(req) as f:
        return f.status, json.loads(f.read().decode('utf-8'))

def test_sales():
    print("Fetching products...")
    status, products = get_json(f"{BASE_URL}/products")
    
    valid_product = None
    for p in products:
        if p.get('stock', 0) > 0:
            valid_product = p
            break
            
    if not valid_product:
        print("No products with stock found!")
        return
        
    product_id = valid_product['id']
    print(f"Using product ID {product_id} with stock {valid_product['stock']}")

    def post_json(url, payload):
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'),
                                     headers={'Content-Type': 'application/json'},
                                     method='POST')
        try:
            with urllib.request.urlopen(req) as f:
                return f.status, json.loads(f.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read().decode('utf-8'))
    
    # 1. Valid sale
    valid_payload = {
        'total': 100,
        'user_id': 1,
        'client_id': 1,
        'payment_method': 'Cash',
        'items': [
            {'id': product_id, 'quantity': 1, 'price': 100}
        ]
    }
    status, data = post_json(f"{BASE_URL}/sales", valid_payload)
    print("1. Valid sale:", status, data)
    
    # 2. Invalid total (<= 0)
    invalid_total_payload = {
        'total': 0,
        'user_id': 1,
        'client_id': 1,
        'payment_method': 'Cash',
        'items': [
            {'id': product_id, 'quantity': 1, 'price': 100}
        ]
    }
    status, data = post_json(f"{BASE_URL}/sales", invalid_total_payload)
    print("2. Invalid total (0):", status, data)

    # 3. Invalid item price (< 0)
    invalid_price_payload = {
        'total': 100,
        'user_id': 1,
        'client_id': 1,
        'payment_method': 'Cash',
        'items': [
            {'id': product_id, 'quantity': 1, 'price': -10}
        ]
    }
    status, data = post_json(f"{BASE_URL}/sales", invalid_price_payload)
    print("3. Invalid price (-10):", status, data)

    # 4. Valid sale with price = 0 (e.g. discount or promo)
    zero_price_payload = {
        'total': 100,
        'user_id': 1,
        'client_id': 1,
        'payment_method': 'Cash',
        'items': [
            {'id': product_id, 'quantity': 1, 'price': 0}
        ]
    }
    status, data = post_json(f"{BASE_URL}/sales", zero_price_payload)
    print("4. Valid zero price (0):", status, data)
    
    # 5. Invalid quantity (<= 0)
    invalid_qty_payload = {
        'total': 100,
        'user_id': 1,
        'client_id': 1,
        'payment_method': 'Cash',
        'items': [
            {'id': product_id, 'quantity': 0, 'price': 100}
        ]
    }
    status, data = post_json(f"{BASE_URL}/sales", invalid_qty_payload)
    print("5. Invalid quantity (0):", status, data)
    
if __name__ == '__main__':
    test_sales()
