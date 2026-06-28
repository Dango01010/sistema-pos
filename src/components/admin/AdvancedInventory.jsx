import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRightLeft, MapPin, Check, X, FileText, Truck, Plus, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination.jsx";

function AdvancedInventory() {
    const { toast } = useToast();
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.ceil(transfers.length / ITEMS_PER_PAGE);
    const paginatedTransfers = transfers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Fetch data on mount
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, transRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/transfers')
                ]);

                if (!prodRes.ok || !transRes.ok) throw new Error('Error fetching data');

                const products = await prodRes.json();
                const transferList = await transRes.json();

                setAvailableProducts(products);
                setTransfers(transferList);
            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [newTransfer, setNewTransfer] = useState({
        origin: '',
        destination: '',
        notes: '',
        items: []
    });

    const [currentItem, setCurrentItem] = useState({ productId: '', quantity: '' });
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    const handleAddItem = () => {
        if (!currentItem.productId || !currentItem.quantity || Number(currentItem.quantity) <= 0) {
            toast({ title: "Error", description: "Seleccione un producto y una cantidad válida.", variant: "destructive" });
            return;
        }

        const product = availableProducts.find(p => p.id.toString() === currentItem.productId);
        if (!product) return;

        const newItem = {
            id: product.id,
            name: product.name,
            brand: product.brand,
            code: product.code,
            quantity: Number(currentItem.quantity)
        };

        const existingItemIndex = newTransfer.items.findIndex(item => item.id === newItem.id);

        let updatedItems;
        if (existingItemIndex >= 0) {
            updatedItems = [...newTransfer.items];
            updatedItems[existingItemIndex].quantity += newItem.quantity;
        } else {
            updatedItems = [...newTransfer.items, newItem];
        }

        setNewTransfer({ ...newTransfer, items: updatedItems });
        setCurrentItem({ productId: '', quantity: '' });
    };

    const handleRemoveItem = (index) => {
        const updatedItems = newTransfer.items.filter((_, i) => i !== index);
        setNewTransfer({ ...newTransfer, items: updatedItems });
    };

    const handleCreateTransfer = async () => {
        if (newTransfer.items.length === 0) {
            toast({ title: "Error", description: "Debe agregar al menos un producto a la transferencia.", variant: "destructive" });
            return;
        }

        const transferData = {
            origin: newTransfer.origin || 'Almacén Central',
            destination: newTransfer.destination,
            notes: newTransfer.notes,
            date: new Date().toLocaleDateString(), // Or ISO string
            items: newTransfer.items.map(i => ({ id: i.id, quantity: i.quantity }))
        };

        try {
            const res = await fetch('/api/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transferData)
            });

            if (!res.ok) throw new Error('Failed to create transfer');
            const data = await res.json();

            // Refresh list
            const updatedListRes = await fetch('/api/transfers');
            const updatedList = await updatedListRes.json();
            setTransfers(updatedList);

            setIsTransferOpen(false);
            setNewTransfer({ origin: '', destination: '', notes: '', items: [] });
            toast({ title: "Transferencia Creada", description: `Solicitud generada correctamente.` });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo crear la transferencia.", variant: "destructive" });
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/transfers/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Failed to update status');

            setTransfers(transfers.map(t => t.id === id ? { ...t, status: newStatus } : t));

            // If we just approved it, ideally the backend should have updated the transfers list status. 
            // We manually update local state to reflect change immediately without re-fetch for smoothness, 
            // although re-fetch is safer.

            setSelectedTransfer(null);
            toast({
                title: newStatus === 'Completado' ? "Transferencia Aprobada" : "Transferencia Rechazada",
                description: `La solicitud #${id} ha sido actualizada a ${newStatus}.`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Inventario Avanzado</h2>
                    <p className="text-muted-foreground">Control de existencias y ubicaciones.</p>
                </div>
            </div>

            <Tabs defaultValue="movements" className="w-full">
                <TabsList className="bg-muted p-1 rounded-xl w-full sm:w-auto overflow-x-auto flex justify-start">
                    <TabsTrigger value="movements">Transferencias</TabsTrigger>
                    <TabsTrigger value="zones">Zonas y Ubicaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="movements" className="space-y-4 mt-6">
                    <div className="glass-panel p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold">Solicitudes de Transferencia</h3>
                            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><ArrowRightLeft className="w-4 h-4 mr-2" /> Nueva Transferencia</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Nueva Transferencia de Stock</DialogTitle>
                                        <DialogDescription>Cree una solicitud de movimiento de inventario.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Origen</Label>
                                                <Input
                                                    placeholder="Ej. Almacén Central"
                                                    value={newTransfer.origin}
                                                    onChange={(e) => setNewTransfer({ ...newTransfer, origin: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Destino</Label>
                                                <Input
                                                    placeholder="Ej. Sucursal Norte"
                                                    value={newTransfer.destination}
                                                    onChange={(e) => setNewTransfer({ ...newTransfer, destination: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Notas</Label>
                                            <Input
                                                placeholder="Detalles adicionales o motivo..."
                                                value={newTransfer.notes}
                                                onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                                            />
                                        </div>

                                        <div className="border-t pt-4 mt-2">
                                            <Label className="mb-2 block">Agregar Productos</Label>
                                            <div className="flex gap-2 items-end mb-4">
                                                <div className="flex-1 space-y-1">
                                                    <span className="text-xs text-muted-foreground">Producto</span>
                                                    <Select
                                                        value={currentItem.productId}
                                                        onValueChange={(val) => setCurrentItem({ ...currentItem, productId: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableProducts.map(p => (
                                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                                    {p.name} <span className="text-muted-foreground">({p.brand})</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-24 space-y-1">
                                                    <span className="text-xs text-muted-foreground">Cant.</span>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={currentItem.quantity}
                                                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                                                    />
                                                </div>
                                                <Button onClick={handleAddItem} size="icon" variant="secondary">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {/* Items List */}
                                            <div className="bg-muted/30 rounded-lg border min-h-[100px] max-h-[200px] overflow-y-auto p-2 space-y-2">
                                                {newTransfer.items.length > 0 ? (
                                                    newTransfer.items.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-sm bg-background p-2 rounded border">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{item.name}</span>
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">{item.brand}</span>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{item.code}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold bg-primary/10 px-2 py-1 rounded text-primary">x{item.quantity}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                                    onClick={() => handleRemoveItem(idx)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm py-4">
                                                        <Plus className="w-8 h-8 mb-2 opacity-50" />
                                                        <p>Agregue productos a la lista</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancelar</Button>
                                        <Button onClick={handleCreateTransfer}>Crear Solicitud</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="pb-3 pl-2">ID</th>
                                        <th className="pb-3">Origen</th>
                                        <th className="pb-3">Destino</th>
                                        <th className="pb-3">Items</th>
                                        <th className="pb-3">Estado</th>
                                        <th className="pb-3 text-right pr-2">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginatedTransfers.map(t => (
                                        <tr key={t.id} className="group hover:bg-muted/50 transition-colors">
                                            <td className="py-3 pl-2 font-mono text-primary">TRF-{t.id}</td>
                                            <td className="py-3">{t.origin}</td>
                                            <td className="py-3">{t.destination}</td>
                                            <td className="py-3">{t.items}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status === 'Pendiente' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    t.status === 'Completado' ? 'bg-green-500/10 text-green-500' :
                                                        t.status === 'Rechazado' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right pr-2">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedTransfer(t)}>Revisar</Button>
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
                </TabsContent>

                <TabsContent value="zones" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {['Zona A', 'Zona B', 'Refrigerado', 'Patio'].map(zone => (
                            <div key={zone} className="glass-card p-4 rounded-xl border-l-4 border-l-primary">
                                <h4 className="font-bold">{zone}</h4>
                                <p className="text-xs text-muted-foreground">85% Ocupación</p>
                                <div className="w-full bg-muted h-1.5 mt-2 rounded-full overflow-hidden">
                                    <div className="bg-primary h-full w-[85%]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Transfer Details Modal */}
            <Dialog open={!!selectedTransfer} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalle de Transferencia #{selectedTransfer?.id}</DialogTitle>
                        <DialogDescription>Revisión de movimiento de inventario entre almacenes.</DialogDescription>
                    </DialogHeader>

                    {selectedTransfer && (
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col md:flex-row gap-4 justify-between bg-muted/30 p-4 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                        <ArrowRightLeft className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Ruta</p>
                                        <div className="flex items-center gap-2 font-medium">
                                            {selectedTransfer.origin} <span className="text-muted-foreground">→</span> {selectedTransfer.destination}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Estado Actual</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-sm font-bold ${selectedTransfer.status === 'Pendiente' ? 'text-yellow-500' :
                                            selectedTransfer.status === 'Completado' ? 'text-green-500' :
                                                selectedTransfer.status === 'Rechazado' ? 'text-red-500' : 'text-blue-500'
                                            }`}>
                                            {selectedTransfer.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Notas e Instrucciones
                                </h4>
                                <p className="text-sm text-muted-foreground bg-card border p-3 rounded-md">
                                    {selectedTransfer.notes || "Sin notas adicionales."}
                                </p>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 px-4 py-2 border-b text-sm font-medium flex justify-between">
                                    <span>Producto</span>
                                    <span>Cantidad</span>
                                </div>
                                <div className="divide-y max-h-40 overflow-y-auto">
                                    {selectedTransfer.productList && selectedTransfer.productList.length > 0 ? (
                                        selectedTransfer.productList.map((item, idx) => (
                                            <div key={idx} className="px-4 py-2 text-sm flex justify-between hover:bg-muted/20">
                                                <span>{item.name} <span className="text-muted-foreground text-xs ml-1">({item.brand})</span></span>
                                                <span className="font-mono">{item.quantity}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                            No hay items listados.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedTransfer(null)}>Cerrar</Button>
                        {selectedTransfer?.status === 'Pendiente' && (
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                                <Button variant="destructive" onClick={() => handleUpdateStatus(selectedTransfer.id, 'Rechazado')}>
                                    <X className="w-4 h-4 mr-2" /> Rechazar
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(selectedTransfer.id, 'Completado')}>
                                    <Check className="w-4 h-4 mr-2" /> Aprobar Transferencia
                                </Button>
                            </div>
                        )}
                        {selectedTransfer?.status === 'En Proceso' && (
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus(selectedTransfer.id, 'Completado')}>
                                <Check className="w-4 h-4 mr-2" /> Marcar como Recibido
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default AdvancedInventory;