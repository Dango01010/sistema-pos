import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Truck, Plus, CheckCircle2, Clock, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination.jsx";

function formatBs(num) {
    return `Bs ${Number(num).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
}

function PurchaseOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Fetch orders on mount
    React.useEffect(() => {
        fetch('/api/purchase-orders')
            .then(res => res.json())
            .then(data => {
                setOrders(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newOrder, setNewOrder] = useState({
        supplier: '',
        total: '',
        status: 'Borrador'
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'Recibido': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'En Tránsito': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const handleCreateOrder = async () => {
        if (!newOrder.supplier || !newOrder.total) {
            return;
        }

        try {
            const res = await fetch('/api/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier: newOrder.supplier,
                    total: parseFloat(newOrder.total),
                    status: 'Borrador'
                })
            });

            if (!res.ok) throw new Error('Error creating PO');

            // Refresh list
            const refreshRes = await fetch('/api/purchase-orders');
            const data = await refreshRes.json();
            setOrders(data);

            setIsNewOrderOpen(false);
            setNewOrder({ supplier: '', total: '', status: 'Borrador' });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Órdenes de Compra</h2>
                    <p className="text-muted-foreground">Gestión de proveedores y reabastecimiento.</p>
                </div>

                <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" /> Nueva Orden
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Orden de Compra</DialogTitle>
                            <DialogDescription>Ingrese los detalles básicos para la nueva orden.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Proveedor</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Nombre del proveedor"
                                    value={newOrder.supplier}
                                    onChange={(e) => setNewOrder({ ...newOrder, supplier: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Monto Estimado</label>
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0.00"
                                    type="number"
                                    value={newOrder.total}
                                    onChange={(e) => setNewOrder({ ...newOrder, total: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsNewOrderOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateOrder}>Crear Orden</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">En Tránsito</p>
                        <p className="text-2xl font-bold text-foreground">{orders.filter(o => o.status === 'En Tránsito').length} Pedidos</p>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Pendientes</p>
                        <p className="text-2xl font-bold text-foreground">
                            {formatBs(orders.filter(o => o.status === 'Borrador').reduce((acc, curr) => acc + parseFloat(typeof curr.total === 'string' ? curr.total.replace(/[^0-9.-]+/g, '') : curr.total), 0))}
                        </p>
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Completados (Mes)</p>
                        <p className="text-2xl font-bold text-foreground">{orders.filter(o => o.status === 'Recibido').length}</p>
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="p-4 font-semibold text-foreground">Orden #</th>
                                <th className="p-4 font-semibold text-foreground">Proveedor</th>
                                <th className="p-4 font-semibold text-foreground">Fecha</th>
                                <th className="p-4 font-semibold text-foreground">Total</th>
                                <th className="p-4 font-semibold text-foreground">Estado</th>
                                <th className="p-4 text-right font-semibold text-foreground">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {paginatedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-mono text-primary font-medium">{order.id}</td>
                                    <td className="p-4 font-medium">{order.supplier}</td>
                                    <td className="p-4 text-muted-foreground">{order.date}</td>
                                    <td className="p-4 font-bold">{formatBs(typeof order.total === 'string' ? order.total.replace(/[^0-9.-]+/g, '') : order.total)}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>Detalles</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={setCurrentPage} 
                />
            </div>

            {/* Details Modal */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de Orden {selectedOrder?.id}</DialogTitle>
                        <DialogDescription>Información completa de la orden de compra.</DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Proveedor</p>
                                    <p className="font-medium">{selectedOrder.supplier}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                                    <p className="font-medium">{selectedOrder.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Estado</p>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-block ${getStatusColor(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Total Estimado</p>
                                    <p className="font-bold text-lg">{formatBs(typeof selectedOrder.total === 'string' ? selectedOrder.total.replace(/[^0-9.-]+/g, '') : selectedOrder.total)}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-muted/20">
                                <h4 className="font-semibold mb-3">Items de la Orden ({selectedOrder.items || 0})</h4>
                                <div className="py-6 text-center">
                                    <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                                    <p className="text-sm text-muted-foreground">
                                        Los items se cargarán del servidor.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Consulte el detalle completo en el módulo de inventario.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cerrar</Button>
                        <Button onClick={() => window.print()}>Imprimir Orden</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PurchaseOrders;