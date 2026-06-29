import re

with open('src/pages/VendedorDashboard.jsx', 'r') as f:
    content = f.read()

content = content.replace('from-blue-600 to-indigo-600 text-slate-900 dark:text-white', 'from-blue-600 to-indigo-600 text-white')
content = content.replace('hover:from-blue-500 hover:to-indigo-500 text-slate-900 dark:text-white', 'hover:from-blue-500 hover:to-indigo-500 text-white')
content = content.replace('text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10', 'hover:text-white hover:bg-slate-200 dark:hover:bg-white/10')
content = content.replace('dark:bg-slate-100/40 dark:bg-slate-900/40', 'dark:bg-slate-900/40')

with open('src/pages/VendedorDashboard.jsx', 'w') as f:
    f.write(content)

print("Fixed blue buttons.")
