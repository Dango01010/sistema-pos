import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Search, ShoppingCart, CreditCard, Package, Plus, Minus,
    QrCode, RefreshCw, FileText, Printer, Tag, User, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/PaymentModal';
import { Pagination } from '@/components/ui/pagination.jsx';
import ProductCard from '@/components/pos/ProductCard.jsx';
import useDebounce from '@/hooks/useDebounce.js';

function VendedorDashboard() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [currency, setCurrency] = useState('Bs');
    const [exchangeRate, setExchangeRate] = useState(6.96);

    const [discountCode, setDiscountCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0);

    // Client State
    const [selectedClient, setSelectedClient] = useState(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clients, setClients] = useState([]);
    const [clientSearch, setClientSearch] = useState('');
    const debouncedClientSearch = useDebounce(clientSearch, 300);
    const [newClient, setNewClient] = useState({ name: '', ci_nit: '', email: '', phone: '' });
    const [showNewClientForm, setShowNewClientForm] = useState(false);

    // Sales History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [mySales, setMySales] = useState([]);

    // Returns State
    const [isReturnOpen, setIsReturnOpen] = useState(location.pathname === '/vendedor/returns');
    const [returnSaleId, setReturnSaleId] = useState('');
    const [returnSaleData, setReturnSaleData] = useState(null);
    const [returnItems, setReturnItems] = useState({});
    const [returnReason, setReturnReason] = useState('Garantía');
    const [returnDescription, setReturnDescription] = useState('');
    const [returnImages, setReturnImages] = useState([]);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Pagination for performance
    const [currentPageProducts, setCurrentPageProducts] = useState(1);
    const [currentPageSales, setCurrentPageSales] = useState(1);

    // Product details modal
    const [selectedProductDetails, setSelectedProductDetails] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleShowDetails = useCallback((product) => {
        setSelectedProductDetails(product);
        setIsDetailsModalOpen(true);
    }, []);

    useEffect(() => {
        if (isClientModalOpen) {
            fetchClients();
        }
    }, [isClientModalOpen, debouncedClientSearch]);

    const fetchClients = () => {
        fetch(`/api/clients?search=${debouncedClientSearch}`)
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(data => setClients(Array.isArray(data) ? data : []))
            .catch(err => console.error(err));
    };

    const handleCreateClient = async () => {
        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClient)
            });
            if (!res.ok) throw new Error("Error en red");
            const data = await res.json();
            if (data.success) {
                toast({ title: "Cliente creado", description: data.name });
                setSelectedClient({ id: data.id, name: data.name });
                setIsClientModalOpen(false);
                setShowNewClientForm(false);
            }
        } catch (error) {
            toast({ title: "Error", description: "No se pudo crear el cliente", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetch('/api/products')
            .then(res => {
                if (!res.ok) throw new Error("Network response was not ok");
                return res.json();
            })
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching products:", err);
                toast({ title: "Error", description: "No se pudieron cargar los productos", variant: "destructive" });
                setLoading(false);
            });
    }, []);

    // Memoized filtered products
    const filteredProducts = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return products.filter(product =>
            (product.name || "").toLowerCase().includes(term) ||
            (product.code || "").toLowerCase().includes(term) ||
            (product.category || "").toLowerCase().includes(term)
        );
    }, [products, searchTerm]);

    const ITEMS_PER_PAGE = 15;
    const totalPageProducts = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const displayedProducts = filteredProducts.slice((currentPageProducts - 1) * ITEMS_PER_PAGE, currentPageProducts * ITEMS_PER_PAGE);

    // Memoized unique categories
    const uniqueCategories = useMemo(() => {
        return [...new Set(products.map(p => p.category))];
    }, [products]);

    const getPrice = useCallback((price) => {
        if (currency === 'Bs') return price.toFixed(2);
        return (price / exchangeRate).toFixed(2);
    }, [currency, exchangeRate]);

    const addToCart = useCallback((product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity < product.stock) {
                    toast({ title: "Cantidad actualizada", description: `${product.name}` });
                    return prevCart.map(item =>
                        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                    );
                } else {
                    toast({ title: "Stock insuficiente", variant: "destructive" });
                    return prevCart;
                }
            } else {
                toast({ title: "Producto agregado", description: `${product.name} añadido al carrito` });
                return [...prevCart, { ...product, quantity: 1 }];
            }
        });
    }, []);

    // Scanner Effect
    useEffect(() => {
        let barcode = "";
        let timeoutId = null;

        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Clear barcode buffer if no key pressed in the last 100ms
            timeoutId = setTimeout(() => {
                barcode = "";
            }, 100);

            if (e.key === 'Enter') {
                if (barcode) {
                    const product = products.find(p => p.code === barcode);
                    if (product) {
                        addToCart(product);
                    } else {
                        toast({ title: "Producto no encontrado", description: barcode, variant: "destructive" });
                    }
                    barcode = "";
                }
            } else if (e.key.length === 1) {
                barcode += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [products, addToCart]);

    const fetchMySales = () => {
        if (!user) return;
        fetch(`/api/sales/my-sales?user_id=${user.id}`)
            .then(res => res.json())
            .then(data => setMySales(Array.isArray(data) ? data : []))
            .catch(err => { console.error(err); toast({ title: 'Error', description: 'No se pudieron cargar las ventas', variant: 'destructive' }); });
    };

    const handleQuote = async () => {
        if (cart.length === 0) return;

        try {
            const res = await fetch('/api/quotations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: selectedClient?.id,
                    total: grandTotal,
                    items: cart.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
                    discount_code: discountCode
                })
            });
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Error al crear cotización");
            }
            
            toast({ title: "Cotización Generada", description: `ID: ${data.id}` });
            setCart([]);
            navigate(`/print/quote/${data.id}`);
        } catch (e) {
            toast({ title: "Error", description: e.message || "No se pudo generar la cotización", variant: "destructive" });
        }
    };

    const handleReturnLookup = async () => {
        if (!returnSaleId) return;
        try {
            const res = await fetch(`/api/sales/${returnSaleId}`);
            if (res.ok) {
                const data = await res.json();
                setReturnSaleData(data);
                setReturnItems({});
                setReturnReason('Garantía');
                setReturnDescription('');
                setReturnImages([]);
            } else {
                toast({ title: "Venta no encontrada", variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const promises = files.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        });
        Promise.all(promises).then(base64Files => {
            setReturnImages(prev => [...prev, ...base64Files]);
        }).catch(err => {
            console.error("Error reading files:", err);
            toast({ title: "Error al cargar imágenes", variant: "destructive" });
        });
    };

    const handleProcessReturn = async () => {
        if (!returnSaleData) return;
        const itemsToReturn = Object.entries(returnItems)
            .filter(([_, qty]) => qty > 0)
            .map(([pid, qty]) => {
                const saleItem = returnSaleData.items?.find(i => i.product_id === parseInt(pid));
                return { product_id: pid, quantity: qty, price: saleItem ? saleItem.price : 0 };
            });

        if (itemsToReturn.length === 0) {
            toast({ title: "Seleccione items para devolver", variant: "warning" });
            return;
        }

        const refundTotal = itemsToReturn.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        try {
            const res = await fetch('/api/returns', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    sale_id: returnSaleData.id || returnSaleData.sale?.id,
                    reason: returnReason,
                    description: returnDescription,
                    evidence_images: returnImages,
                    total: refundTotal,
                    items: itemsToReturn
                })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: "Devolución procesada", description: `ID: ${data.id}` });
                setIsReturnOpen(false);
                setReturnSaleData(null);
                setReturnSaleId('');
                setReturnItems({});
                setReturnReason('Garantía');
                setReturnDescription('');
                setReturnImages([]);
            }
        } catch (e) {
            toast({ title: "Error al procesar devolución", variant: "destructive" });
        }
    };

    const updateQuantity = (productId, change) => {
        const item = cart.find(i => i.id === productId);
        const product = products.find(p => p.id === productId);

        if (!product || !item) return;

        if (item.quantity + change > product.stock) {
            toast({ title: "Stock límite alcanzado", variant: "destructive" });
            return;
        }

        if (item.quantity + change <= 0) {
            setCart(cart.filter(i => i.id !== productId));
            return;
        }

        setCart(cart.map(i =>
            i.id === productId ? { ...i, quantity: i.quantity + change } : i
        ));
    };

    const handleApplyDiscount = () => {
        if (discountCode.trim().toUpperCase() === 'PROMO10') {
            const amount = cartTotal * 0.10;
            setDiscountAmount(amount);
            toast({ title: "Cupón Aplicado", description: "10% de descuento agregado" });
        } else if (discountCode.trim() === '') {
            setDiscountAmount(0);
        } else {
            toast({ title: "Cupón Inválido", variant: "destructive" });
            setDiscountAmount(0);
        }
    };

    const handleScanHelper = () => {
        toast({
            title: "Escáner Activo",
            description: "El sistema está listo para recibir entrada de pistola de códigos de barras o teclado.",
            variant: "default"
        });
    };

    // Routing sync effects
    useEffect(() => {
        if (location.pathname === '/vendedor/returns') {
            setIsReturnOpen(true);
        } else if (location.pathname === '/vendedor/scan') {
            handleScanHelper();
            navigate('/vendedor');
        }
    }, [location.pathname]);

    useEffect(() => {
        if (!isReturnOpen && location.pathname === '/vendedor/returns') {
            navigate('/vendedor');
        }
    }, [isReturnOpen, location.pathname, navigate]);

    const handleOpenReturnFromHistory = (id) => {
        setIsHistoryOpen(false);
        setReturnSaleId(id);
        setIsReturnOpen(true);
        toast({ description: "ID de venta copiado para devolución. Click 'Buscar'." });
    };

    const handleCheckoutClick = () => {
        if (!user) {
            toast({ title: "Error", description: "Usuario no autenticado", variant: "destructive" });
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handleFinalizeSale = async (paymentData) => {
        const saleData = {
            user_id: user.id,
            total: grandTotal,
            client_id: selectedClient?.id,
            payment_method: paymentData.method,
            discount_code: discountCode,
            items: cart.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: item.price
            }))
        };

        setIsProcessing(true);
        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                let errDesc = "Error al procesar la venta";
                try {
                    const errRes = await response.json();
                    errDesc = errRes.error || errDesc;
                } catch (e) {}
                throw new Error(errDesc);
            }

            const result = await response.json();

            // Venta Ok
            toast({
                    title: "Venta Exitosa",
                    description: `ID: ${result.sale_id} - ${paymentData.method === 'cash' ? 'Efectivo' : 'QR'}`
                });
                
                setCart([]);
                setDiscountCode('');
                setDiscountAmount(0);
                setSelectedClient(null);
                setIsPaymentModalOpen(false);
                setProducts(prev => prev.map(p => {
                    const cartItem = cart.find(c => c.id === p.id);
                    if (cartItem) {
                        return { ...p, stock: p.stock - cartItem.quantity };
                    }
                    return p;
                }));

                if (paymentData.documentType === 'receipt') {
                    navigate(`/print/receipt/${result.sale_id}`);
                } else if (paymentData.documentType === 'invoice') {
                    navigate(`/print/invoice/${result.sale_id}`);
                }
        } catch (error) {
            console.error('Error finalizing sale:', error);
            toast({
                title: "Error",
                description: error.message || "Error de conexión",
                variant: "destructive"
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCurrencyToggle = async () => {
        if (currency === 'Bs') {
            setCurrency('USD');
            try {
                const res = await fetch("https://bo.dolarapi.com/v1/dolares/binance");
                if (res.ok) {
                    const data = await res.json();
                    if (data.venta) {
                        setExchangeRate(data.venta);
                        toast({ title: "Tipo de Cambio Actualizado", description: `Dólar Binance (Venta): ${data.venta} Bs` });
                    }
                }
            } catch (e) {
                console.error("Error fetching DolarAPI:", e);
                toast({ title: "Error al obtener T/C", description: "No se pudo conectar con DolarAPI. Ajuste manual requerido.", variant: "warning" });
            }
        } else {
            setCurrency('Bs');
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = (cartTotal - discountAmount) * 0.13;
    const grandTotal = (cartTotal - discountAmount) + tax;

    // Removed duplicate displayedProducts and hasMore

    return (
        <>
            <Helmet>
                <title>POS Vendedor - Multirepuestos Ramos</title>
            </Helmet>
            <DashboardLayout role="vendedor">
                <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] gap-6 pb-4">

                    {/* Left Column: Catalog */}
                    <div className="flex-1 flex flex-col gap-6 min-w-0">
                        {/* Header & Search */}
                        <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg z-10">
                            <div className="relative w-full max-w-md group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto, código o categoría..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner"
                                />
                                <button
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                    onClick={handleScanHelper}
                                >
                                    <QrCode className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => { setIsHistoryOpen(true); fetchMySales(); }}
                                    className="border-slate-200 dark:border-white/10 bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white min-w-[100px]"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Mis Ventas
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCurrencyToggle}
                                    className="border-slate-200 dark:border-white/10 bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white min-w-[100px]"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    {currency === 'USD' ? 'USD ($)' : 'Bs (BOL)'}
                                </Button>
                                {currency === 'USD' && (
                                    <div className="flex items-center gap-1.5 bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-1.5 rounded-md text-xs text-slate-900 dark:text-white">
                                        <span className="text-slate-500 dark:text-slate-400">T/C:</span>
                                        <input
                                            type="number"
                                            value={exchangeRate}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (val > 0) setExchangeRate(val);
                                            }}
                                            className="w-12 bg-transparent text-slate-900 dark:text-white focus:outline-none text-right font-medium"
                                            step="0.01"
                                            min="0.01"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Categories Row */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                            <button
                                className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${searchTerm === '' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-transparent' : 'bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-200 dark:border-white/10'}`}
                                onClick={() => setSearchTerm('')}
                            >
                                ✨ Todos
                            </button>
                            {uniqueCategories.map(cat => (
                                <button
                                    key={cat}
                                    className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 ${searchTerm === cat ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-transparent' : 'bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-200 dark:border-white/10'}`}
                                    onClick={() => setSearchTerm(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Product Grid - Optimized with smooth scroll */}
                        <div className="flex-1 overflow-y-auto pr-2 pb-24 scroll-smooth">
                            {filteredProducts.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                                        {displayedProducts.map((product) => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                currency={currency}
                                                onAddToCart={addToCart}
                                                getPrice={getPrice}
                                                onShowDetails={handleShowDetails}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-8 mb-4">
                                        <Pagination 
                                            currentPage={currentPageProducts} 
                                            totalPages={totalPageProducts} 
                                            onPageChange={setCurrentPageProducts} 
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    No se encontraron productos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Cart - Same as AdminPOS */}
                    <div className="w-full lg:w-[420px] flex flex-col glass-panel rounded-2xl overflow-hidden border-l border-slate-200 dark:border-white/10 shadow-2xl h-full">
                        <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-100/60 dark:bg-slate-900/60">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors group" onClick={() => setIsClientModalOpen(true)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-slate-900 dark:text-white font-bold shadow-lg">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-400 transition-colors">
                                            {selectedClient ? selectedClient.name : 'Cliente General'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {selectedClient ? 'Cliente Registrado' : 'Sin programa de lealtad'}
                                        </p>
                                    </div>
                                </div>
                                <Button size="sm" variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"><Plus className="w-4 h-4" /></Button>
                            </div>
                        </div>

                        <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
                            <DialogContent className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Seleccionar Cliente</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    {!showNewClientForm ? (
                                        <>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                                    <Input
                                                        placeholder="Buscar por nombre..."
                                                        className="pl-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                                                        value={clientSearch}
                                                        onChange={(e) => setClientSearch(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={() => setShowNewClientForm(true)}>Nuevo</Button>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                                <div className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 dark:border-white/10"
                                                    onClick={() => { setSelectedClient(null); setIsClientModalOpen(false); }}>
                                                    <p className="font-bold">Cliente General</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Venta de mostrador</p>
                                                </div>
                                                {clients.map(c => (
                                                    <div key={c.id}
                                                        className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 dark:border-white/10"
                                                        onClick={() => { setSelectedClient(c); setIsClientModalOpen(false); }}>
                                                        <p className="font-bold">{c.name}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{c.email} • {c.phone}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Nombre o Razón Social</Label>
                                                <Input value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>CI / NIT</Label>
                                                <Input value={newClient.ci_nit} onChange={e => setNewClient({ ...newClient, ci_nit: e.target.value })} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Email <span className="text-xs text-muted-foreground">(Opcional)</span></Label>
                                                    <Input value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Teléfono <span className="text-xs text-muted-foreground">(Opcional)</span></Label>
                                                    <Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-4">
                                                <Button variant="ghost" onClick={() => setShowNewClientForm(false)}>Cancelar</Button>
                                                <Button onClick={handleCreateClient} disabled={!newClient.name.trim() || !newClient.ci_nit.trim()}>Guardar Cliente</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-slate-100/30 dark:bg-slate-900/30">
                            <AnimatePresence initial={false}>
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                            <ShoppingCart className="w-10 h-10 stroke-1" />
                                        </div>
                                        <p className="text-sm">El carrito está vacío</p>
                                        <p className="text-xs mt-1">Escanea o selecciona productos</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <motion.div
                                            layout
                                            key={item.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -50 }}
                                            className="bg-white/5 hover:bg-white/[0.08] rounded-xl p-3 flex gap-3 group border border-transparent hover:border-slate-200 dark:border-white/5 transition-all"
                                        >
                                            <img src={item.image || '/vite.svg'} alt="" className="w-16 h-16 rounded-lg object-cover bg-white dark:bg-slate-800 shadow-sm" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate pr-2">{item.name}</h4>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            Unit: {currency === 'USD' ? '$' : 'Bs '}{getPrice(item.price)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1000)}
                                                        className="text-slate-600 hover:text-rose-400 transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-1 bg-white dark:bg-slate-950 rounded-lg p-0.5 border border-slate-200 dark:border-white/5">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                                                        <span className="text-xs font-bold w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                    <span className="font-bold text-sm text-blue-400">
                                                        {currency === 'USD' ? '$' : 'Bs '}
                                                        {getPrice(item.price * item.quantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="p-5 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Código de cupón"
                                        value={discountCode}
                                        onChange={(e) => setDiscountCode(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <Button size="sm" variant="outline" className="text-xs border-slate-200 dark:border-white/10" onClick={handleApplyDiscount}>Aplicar</Button>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-400 text-sm">
                                    <span>Descuento</span>
                                    <span>-{currency === 'USD' ? '$' : 'Bs '}{getPrice(discountAmount)}</span>
                                </div>
                            )}

                            <div className="space-y-2 text-sm pt-2">
                                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{currency === 'USD' ? '$' : 'Bs '}{getPrice(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                                    <span>Impuestos (13%)</span>
                                    <span>{currency === 'USD' ? '$' : 'Bs '}{getPrice(tax)}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-white/10 items-end">
                                    <span className="text-base text-slate-600 dark:text-slate-300 font-normal">Total a Pagar</span>
                                    <span className="premium-text-gradient">{currency === 'USD' ? '$' : 'Bs '}{getPrice(grandTotal)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <Button variant="outline" className="border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5 text-slate-900 dark:text-white h-12" onClick={() => setIsReturnOpen(true)}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Devolución
                                </Button>
                                <Button variant="outline" className="border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5 text-slate-900 dark:text-white h-12" onClick={handleQuote}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Cotizar
                                </Button>
                                <Button
                                    disabled={cart.length === 0}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-12 text-sm font-semibold shadow-lg shadow-blue-600/20"
                                    onClick={handleCheckoutClick}
                                >
                                    <CreditCard className="w-4 h-4 mr-2" />
                                    Cobrar
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>

                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogContent className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-3xl">
                        <DialogHeader><DialogTitle>Mis Ventas</DialogTitle></DialogHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mySales.slice((currentPageSales - 1) * ITEMS_PER_PAGE, currentPageSales * ITEMS_PER_PAGE).map(sale => (
                                    <TableRow key={sale.id}>
                                        <TableCell>{sale.id}</TableCell>
                                        <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{sale.client_name || 'Cliente General'}</TableCell>
                                        <TableCell>Bs {sale.total.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="ghost" onClick={() => handleOpenReturnFromHistory(sale.id)} title="Procesar Devolución">
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination 
                            currentPage={currentPageSales} 
                            totalPages={Math.ceil(mySales.length / ITEMS_PER_PAGE)} 
                            onPageChange={setCurrentPageSales} 
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
                    <DialogContent className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-3xl">
                        <DialogHeader><DialogTitle>Gestionar Devolución</DialogTitle></DialogHeader>
                        <div className="flex gap-2 mb-4">
                            <Input placeholder="ID Venta" value={returnSaleId} onChange={e => setReturnSaleId(e.target.value)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                            <Button onClick={handleReturnLookup}>Buscar</Button>
                        </div>
                        {returnSaleData && (
                            <div className="space-y-4">
                                <div className="p-3 bg-white/5 rounded space-y-2">
                                    <p className="font-bold">Venta #{returnSaleData.id} - Total: Bs {returnSaleData.total}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        Cliente: {returnSaleData.client_name || 'Consumidor Final'} {returnSaleData.client_ci ? `(${returnSaleData.client_ci})` : ''}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Motivo de Devolución</Label>
                                        <select 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2"
                                            value={returnReason}
                                            onChange={e => setReturnReason(e.target.value)}
                                        >
                                            <option value="Garantía">Garantía</option>
                                            <option value="Defecto de fábrica">Defecto de fábrica</option>
                                            <option value="Error de cliente">Error de cliente</option>
                                            <option value="Producto dañado en tienda">Producto dañado en tienda</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Evidencia Fotográfica (Opcional)</Label>
                                        <Input type="file" accept="image/*" multiple onChange={handleImageUpload} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                        {returnImages.length > 0 && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{returnImages.length} imagen(es) seleccionada(s)</p>
                                        )}
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Descripción del Problema</Label>
                                        <textarea 
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-2 min-h-[80px]"
                                            placeholder="Detalla el motivo de la devolución..."
                                            value={returnDescription}
                                            onChange={e => setReturnDescription(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>Cant. Comprada</TableHead>
                                            <TableHead>Devolver</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnSaleData.items.map(item => (
                                            <TableRow key={item.product_id || item.id}>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setReturnItems(prev => ({ ...prev, [item.product_id]: Math.max((prev[item.product_id] || 0) - 1, 0) }))}>-</Button>
                                                        <span>{returnItems[item.product_id] || 0}</span>
                                                        <Button size="sm" variant="outline" onClick={() => setReturnItems(prev => ({ ...prev, [item.product_id]: Math.min((prev[item.product_id] || 0) + 1, item.quantity) }))}>+</Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Button onClick={handleProcessReturn} className="w-full">Procesar Devolución</Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Product Details Modal */}
                <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
                    <DialogContent className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Detalles del Producto</DialogTitle>
                        </DialogHeader>
                        {selectedProductDetails && (
                            <div className="space-y-6">
                                <div className="flex gap-6">
                                    <div className="w-64 h-64 rounded-xl overflow-hidden bg-white dark:bg-slate-800 flex-shrink-0">
                                        <img
                                            src={selectedProductDetails.image}
                                            alt={selectedProductDetails.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-500 font-mono">{selectedProductDetails.code}</p>
                                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{selectedProductDetails.name}</h3>
                                            {selectedProductDetails.brand && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Marca: {selectedProductDetails.brand}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Categoría</p>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{selectedProductDetails.category}</p>
                                            </div>
                                            <div className="p-3 bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Stock Disponible</p>
                                                <p className={`text-sm font-bold mt-1 ${selectedProductDetails.stock > 10 ? 'text-emerald-400' :
                                                    selectedProductDetails.stock > 0 ? 'text-yellow-400' : 'text-rose-400'
                                                    }`}>
                                                    {selectedProductDetails.stock} unidades
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl border border-blue-500/30">
                                            <p className="text-xs text-slate-600 dark:text-slate-300">Precio</p>
                                            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                                {currency === 'USD' ? '$' : 'Bs '}{getPrice(selectedProductDetails.price)}
                                            </p>
                                        </div>

                                        {selectedProductDetails.description && (
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Descripción</p>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{selectedProductDetails.description}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button
                                        onClick={() => {
                                            addToCart(selectedProductDetails);
                                            setIsDetailsModalOpen(false);
                                        }}
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                                        disabled={selectedProductDetails.stock === 0}
                                    >
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        {selectedProductDetails.stock > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    total={currency === 'Bs' ? grandTotal : grandTotal / exchangeRate}
                    currency={currency}
                    onConfirm={handleFinalizeSale}
                    isProcessing={isProcessing}
                />
            </DashboardLayout>
        </>
    );
}

export default VendedorDashboard;