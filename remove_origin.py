import re

files = ['src/pages/AdminPOS.jsx', 'src/pages/VendedorDashboard.jsx']

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    # regex to remove the origin input div
    content = re.sub(
        r'<div className="space-y-2">\s*<Label>Procedencia \(Opcional\)</Label>\s*<Input\s*placeholder="Ej: Importación directa"\s*value=\{quoteDetails\.origin\}\s*onChange=\{\(e\) => setQuoteDetails\(\{\.\.\.quoteDetails, origin: e\.target\.value\}\)\}\s*className="[^"]*"\s*/>\s*</div>',
        '',
        content
    )
    
    with open(file, 'w') as f:
        f.write(content)

print("Origin field removed from modals.")
