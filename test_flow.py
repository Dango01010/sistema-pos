import urllib.request
import json
import time

BASE_URL = "http://localhost:5000/api"

def create_product():
    url = f"{BASE_URL}/products"
    data = {
        "name": "Test Product E2E",
        "brand": "TestBrand",
        "code": f"TEST-{int(time.time())}",
        "category": "TestCategory",
        "stock": 100,
        "price": 50,
        "min": 10
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    response = urllib.request.urlopen(req)
    res_data = json.loads(response.read().decode('utf-8'))
    return res_data['id']

def create_sale(product_id, quantity, price):
    url = f"{BASE_URL}/sales"
    data = {
        "items": [{"id": product_id, "quantity": quantity, "price": price}],
        "total": quantity * price,
        "user_id": 1,
        "client_id": 1,
        "payment_method": "cash"
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    response = urllib.request.urlopen(req)
    res_data = json.loads(response.read().decode('utf-8'))
    return res_data

def get_product(product_id):
    url = f"{BASE_URL}/products"
    response = urllib.request.urlopen(url)
    products = json.loads(response.read().decode('utf-8'))
    for p in products:
        if p['id'] == product_id:
            return p
    return None

def main():
    print("--- INICIANDO PRUEBA E2E ---")
    try:
        # 1. Crear producto
        print("1. Creando producto con stock 100...")
        product_id = create_product()
        print(f"   Producto creado con ID: {product_id}")
        
        # 2. Registrar venta
        print("2. Registrando venta de 10 unidades...")
        create_sale(product_id, 10, 50)
        print("   Venta registrada correctamente.")
        
        # 3. Verificar stock
        print("3. Verificando reducción de stock...")
        product = get_product(product_id)
        if product is None:
            print("   ERROR: Producto no encontrado.")
            print("VEREDICTO DE FUNCIONALIDAD: 0% - FAIL")
            return
            
        stock_actual = product.get('stock', 0)
        print(f"   Stock actual: {stock_actual}")
        
        if stock_actual == 90:
            print("   ÉXITO: El stock se redujo correctamente de 100 a 90.")
            print("VEREDICTO DE FUNCIONALIDAD: 100% - PASS")
        else:
            print(f"   ERROR: El stock esperado era 90, pero es {stock_actual}.")
            print("VEREDICTO DE FUNCIONALIDAD: 50% - FAIL (Flujo completado pero lógica de stock incorrecta)")
            
    except Exception as e:
        print(f"ERROR durante la prueba: {e}")
        print("VEREDICTO DE FUNCIONALIDAD: 0% - FAIL")

if __name__ == '__main__':
    main()
