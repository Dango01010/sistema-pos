import re

with open('src/pages/VendedorDashboard.jsx', 'r') as f:
    content = f.read()

# Replacements for light mode compatibility
replacements = {
    r'\bbg-slate-900\b': 'bg-slate-100 dark:bg-slate-900',
    r'\bbg-slate-950\b': 'bg-white dark:bg-slate-950',
    r'\bbg-slate-800\b': 'bg-white dark:bg-slate-800',
    r'\bbg-slate-900/60\b': 'bg-slate-100/60 dark:bg-slate-900/60',
    r'\bbg-slate-900/30\b': 'bg-slate-100/30 dark:bg-slate-900/30',
    r'\bbg-slate-900/40\b': 'bg-slate-100/40 dark:bg-slate-900/40',
    r'\btext-white\b': 'text-slate-900 dark:text-white',
    r'\btext-slate-400\b': 'text-slate-500 dark:text-slate-400',
    r'\btext-slate-300\b': 'text-slate-600 dark:text-slate-300',
    r'\bborder-white/10\b': 'border-slate-200 dark:border-white/10',
    r'\bborder-white/5\b': 'border-slate-200 dark:border-white/5',
    r'\bborder-slate-700\b': 'border-slate-200 dark:border-slate-700',
    r'\bhover:text-white\b': 'hover:text-slate-900 dark:hover:text-white',
    r'\bhover:bg-white/10\b': 'hover:bg-slate-200 dark:hover:bg-white/10',
    r'\bhover:bg-white/5\b': 'hover:bg-slate-200 dark:hover:bg-white/5',
    r'\bshadow-\[0_-10px_40px_rgba\(0,0,0,0\.5\)\]\b': 'shadow-lg dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]',
}

for pattern, replacement in replacements.items():
    content = re.sub(pattern, replacement, content)

with open('src/pages/VendedorDashboard.jsx', 'w') as f:
    f.write(content)

print("Updated VendedorDashboard.jsx theme classes.")
