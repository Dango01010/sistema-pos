import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Edit, Trash2, Package, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Pagination } from "@/components/ui/pagination.jsx";

function InventoryModule() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const [formState, setFormState] = useState({
        id: null,
        name: '',
        brand: '',
        code: '',
        category: '',
        stock: '',
        price: '',
        min: '',
        image: null
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [previewImage, setPreviewImage] = useState(null); // State for image preview
    const fileInputRef = useRef(null);

    // Categories state
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    // Fetch products on mount
    React.useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products');
                const data = await res.json();
                setProducts(data);
            } catch (error) {
                console.error("Error fetching products:", error);
                toast({ title: "Error", description: "No se pudo cargar el inventario.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                const data = await res.json();
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        fetchProducts();
        fetchCategories();
    }, []);

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormState({ ...formState, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };


    const handleOpenAdd = () => {
        setIsEditing(false);
        setFormState({ id: null, name: '', brand: '', code: '', category: '', stock: '', price: '', min: '', image: null });
        setCategorySearch('');
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (product) => {
        setIsEditing(true);
        setFormState({ ...product });
        setCategorySearch(product.category || '');
        setIsDialogOpen(true);
    };

    const handleSaveProduct = async () => {
        if (!formState.name || !formState.price || !formState.brand || !formState.code) {
            toast({ title: "Error", description: "Por favor complete nombre, marca, código y precio", variant: "destructive" });
            return;
        }

        try {
            if (isEditing) {
                const res = await fetch(`/api/products/${formState.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formState)
                });
                if (!res.ok) throw new Error('Error updating product');

                setProducts(products.map(p => p.id === formState.id ? {
                    ...formState,
                    stock: Number(formState.stock),
                    price: Number(formState.price),
                    min: Number(formState.min)
                } : p));
                toast({ title: "Producto Actualizado", description: `${formState.name} ha sido modificado correctamente.` });
            } else {
                const res = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formState)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    if (errData.error === 'Code must be unique') {
                        throw new Error('El código ya existe, use uno diferente');
                    }
                    throw new Error('Error creating product');
                }
                const resData = await res.json();

                const productToAdd = {
                    id: resData.id,
                    ...formState,
                    stock: Number(formState.stock) || 0,
                    price: Number(formState.price) || 0,
                    min: Number(formState.min) || 0
                };
                setProducts([...products, productToAdd]);
                toast({ title: "Producto Agregado", description: `${productToAdd.name} añadido correctamente.` });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: error.message || "No se pudo guardar el producto.", variant: "destructive" });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'No se pudo eliminar', variant: 'destructive' });
                return;
            }
            setProducts(products.filter(p => p.id !== id));
            toast({ title: "Producto Eliminado", description: "El producto ha sido eliminado del inventario." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "destructive" });
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o marca..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Producto
                </Button>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? 'Editar Producto' : 'Agregar Nuevo Producto'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={triggerFileInput}>
                                {formState.image ? (
                                    <div className="relative w-full h-32">
                                        <img src={formState.image} alt="Preview" className="w-full h-full object-contain" />
                                        <Button variant="ghost" size="icon" className="absolute top-0 right-0" onClick={(e) => { e.stopPropagation(); setFormState({ ...formState, image: null }); }}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-400">Clic para subir imagen</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Producto</Label>
                                    <Input
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.name}
                                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                                        placeholder="Ej. Filtro de Aire"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Marca</Label>
                                    <Input
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.brand}
                                        onChange={(e) => setFormState({ ...formState, brand: e.target.value })}
                                        placeholder="Ej. Toyota, Bosch..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Código SKU (Manual)</Label>
                                    <Input
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.code}
                                        onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                                        placeholder="Ej. TOY-001"
                                    />
                                </div>
                                <div className="space-y-2 relative">
                                    <Label>Categoría</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                className="bg-slate-800 border-slate-700"
                                                value={categorySearch}
                                                onChange={(e) => {
                                                    setCategorySearch(e.target.value);
                                                    setShowCategoryDropdown(true);
                                                    setFormState({ ...formState, category: '' }); // reset valid selection
                                                }}
                                                onFocus={() => setShowCategoryDropdown(true)}
                                                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                                placeholder="Buscar categoría..."
                                            />
                                            {showCategoryDropdown && categorySearch && (
                                                <div className="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                                                    {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length > 0 ? (
                                                        categories
                                                            .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                                                            .map((cat, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-sm text-slate-200"
                                                                    onClick={() => {
                                                                        setCategorySearch(cat.name);
                                                                        setFormState({ ...formState, category: cat.name });
                                                                        setShowCategoryDropdown(false);
                                                                    }}
                                                                >
                                                                    {cat.name}
                                                                </div>
                                                            ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-sm text-slate-400">Sin resultados</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="px-3 border-slate-700 bg-slate-800 text-slate-300"
                                            onClick={() => setIsCategoryModalOpen(true)}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    {!formState.category && categorySearch && !showCategoryDropdown && (
                                        <p className="text-xs text-rose-500">Debe seleccionar una categoría de la lista.</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Stock</Label>
                                    <Input
                                        type="number"
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.stock}
                                        onChange={(e) => setFormState({ ...formState, stock: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mínimo</Label>
                                    <Input
                                        type="number"
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.min}
                                        onChange={(e) => setFormState({ ...formState, min: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio (Bs)</Label>
                                    <Input
                                        type="number"
                                        className="bg-slate-800 border-slate-700"
                                        value={formState.price}
                                        onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700 text-white hover:bg-slate-800">Cancelar</Button>
                            <Button onClick={handleSaveProduct} className="bg-blue-600 hover:bg-blue-700">{isEditing ? 'Guardar Cambios' : 'Guardar Producto'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Image Preview Modal */}
                <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                    <DialogContent className="sm:max-w-3xl bg-black/90 border-0 p-0 overflow-hidden flex items-center justify-center">
                        <div className="relative w-full h-[80vh] flex items-center justify-center">
                            {previewImage && (
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain"
                                />
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
                                onClick={() => setPreviewImage(null)}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="glass-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Imagen</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Código</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Marca</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Producto</th>
                                <th className="text-left py-4 px-6 text-foreground font-semibold">Categoría</th>
                                <th className="text-center py-4 px-6 text-foreground font-semibold">Stock</th>
                                <th className="text-right py-4 px-6 text-foreground font-semibold">Precio</th>
                                <th className="text-right py-4 px-6 text-foreground font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedProducts.map((product, index) => (
                                <motion.tr
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="border-t border-border hover:bg-accent/50 transition-colors"
                                >
                                    <td className="py-4 px-6">
                                        <div
                                            className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 cursor-pointer hover:border-blue-500 transition-colors"
                                            onClick={() => product.image && setPreviewImage(product.image)}
                                        >
                                            {product.image ? (
                                                <img src={product.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-muted-foreground font-mono text-sm">{product.code}</td>
                                    <td className="py-4 px-6 text-primary font-medium">{product.brand}</td>
                                    <td className="py-4 px-6 text-foreground font-medium">{product.name}</td>
                                    <td className="py-4 px-6 text-muted-foreground">{product.category}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${product.stock > product.min * 2 ? 'bg-green-500/20 text-green-400' :
                                            product.stock > product.min ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-foreground font-semibold">Bs {Number(product.price).toFixed(2)}</td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(product)}
                                                className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                    />
                )}
            </div>


        {/* Modal para Nueva Categoría */}
        <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nueva Categoría</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Nombre de la Categoría</Label>
                        <Input
                            className="bg-slate-800 border-slate-700"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Ej. Lubricantes Especiales"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="border-slate-700" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreateCategory}>Crear Categoría</Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default InventoryModule;