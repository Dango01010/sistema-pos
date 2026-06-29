import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, X, AlertCircle, Eye, FileText } from 'lucide-react';
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

const AuthenticatedImage = ({ src, alt, className }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetch(src, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                setImageSrc(URL.createObjectURL(blob));
            } catch (err) {
                console.error('Error fetching image:', err);
                setError(true);
            }
        };
        fetchImage();

        return () => {
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [src]);

    if (error) {
        return <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>Error</div>;
    }

    if (!imageSrc) {
        return <div className={`flex items-center justify-center bg-muted animate-pulse ${className}`}>Cargando...</div>;
    }

    return <img src={imageSrc} alt={alt} className={className} />;
};

function RMAModule() {
    const [rmas, setRmas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPagePending, setCurrentPagePending] = useState(1);
    const [currentPageHistory, setCurrentPageHistory] = useState(1);

    // Fetch returns on mount
    React.useEffect(() => {
        fetch('/api/returns', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                setRmas(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const [selectedRMA, setSelectedRMA] = useState(null);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/returns/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error('Error updating status');

            setRmas(rmas.map(rma => rma.id === id ? { ...rma, status: newStatus } : rma));
            if (selectedRMA?.id === id) setSelectedRMA(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleApprove = (id) => handleUpdateStatus(id, 'approved');
    const handleReject = (id) => handleUpdateStatus(id, 'rejected');

    const pendingRMAs = rmas.filter(r => r.status === 'pending');
    const historyRMAs = rmas.filter(r => r.status !== 'pending');

    const ITEMS_PER_PAGE = 15;
    const totalPagesPending = Math.ceil(pendingRMAs.length / ITEMS_PER_PAGE);
    const paginatedPending = pendingRMAs.slice((currentPagePending - 1) * ITEMS_PER_PAGE, currentPagePending * ITEMS_PER_PAGE);

    const totalPagesHistory = Math.ceil(historyRMAs.length / ITEMS_PER_PAGE);
    const paginatedHistory = historyRMAs.slice((currentPageHistory - 1) * ITEMS_PER_PAGE, currentPageHistory * ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">


            <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    Solicitudes Pendientes
                    {pendingRMAs.length > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingRMAs.length}</span>
                    )}
                </h3>

                {pendingRMAs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Check className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>No hay solicitudes pendientes.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {paginatedPending.map(rma => (
                            <div key={rma.id} className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 bg-card border border-border rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-red-500/10 rounded-lg text-red-500 h-fit">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground">RMA-{rma.id}: {rma.title || 'Devolución de Venta'}</h4>
                                        <p className="text-sm text-muted-foreground">Cliente: {rma.client} • Factura #{rma.invoice}</p>
                                        <p className="text-xs mt-1 text-red-400 bg-red-500/5 w-fit px-2 py-0.5 rounded">Motivo: {rma.reason}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => setSelectedRMA(rma)}>
                                        <Eye className="w-4 h-4 mr-2" /> Detalles
                                    </Button>
                                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 w-full md:w-auto" onClick={() => handleApprove(rma.id)}>
                                        <Check className="w-4 h-4 mr-2" /> Aprobar
                                    </Button>
                                    <Button size="sm" variant="destructive" className="w-full md:w-auto" onClick={() => handleReject(rma.id)}>
                                        <X className="w-4 h-4 mr-2" /> Rechazar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <Pagination 
                    currentPage={currentPagePending} 
                    totalPages={totalPagesPending} 
                    onPageChange={setCurrentPagePending} 
                />
            </div>

            {historyRMAs.length > 0 && (
                <div className="opacity-60 mt-8">
                    <h3 className="font-bold mb-4 text-muted-foreground">Historial Reciente</h3>
                    <div className="space-y-4">
                        {paginatedHistory.map(rma => (
                            <div key={rma.id} className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 bg-card border border-border rounded-xl">
                                <div className="flex gap-4">
                                    <div className={`p-3 rounded-lg h-fit ${rma.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {rma.status === 'approved' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground">RMA-{rma.id}: {rma.title || 'Devolución de Venta'}</h4>
                                        <p className="text-sm text-muted-foreground">Cliente: {rma.client} • Factura #{rma.invoice} • Fecha: {rma.date}</p>
                                        <div className="flex gap-2 mt-1">
                                            <p className="text-xs bg-muted px-2 py-0.5 rounded">Motivo: {rma.reason}</p>
                                            <p className={`text-xs px-2 py-0.5 rounded ${rma.status === 'approved' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                                {rma.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button size="sm" variant="outline" className="w-full md:w-auto" onClick={() => setSelectedRMA(rma)}>
                                        <Eye className="w-4 h-4 mr-2" /> Detalles
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination 
                        currentPage={currentPageHistory} 
                        totalPages={totalPagesHistory} 
                        onPageChange={setCurrentPageHistory} 
                    />
                </div>
            )}

            {/* Details Modal */}
            <Dialog open={!!selectedRMA} onOpenChange={(open) => !open && setSelectedRMA(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalle de Solicitud RMA-{selectedRMA?.id}</DialogTitle>
                        <DialogDescription>Revisión detallada para aprobación o rechazo.</DialogDescription>
                    </DialogHeader>

                    {selectedRMA && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</p>
                                    <p className="font-medium">{selectedRMA.client}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Factura Original</p>
                                    <p className="font-medium">{selectedRMA.invoice}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Fecha Solicitud</p>
                                    <p className="font-medium">{selectedRMA.date}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Motivo</p>
                                    <span className="inline-block px-2 py-0.5 rounded bg-red-100 text-red-700 text-sm font-medium">
                                        {selectedRMA.reason}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Descripción del Problema
                                </h4>
                                <p className="text-sm bg-card border p-3 rounded-md text-muted-foreground leading-relaxed">
                                    {selectedRMA.description}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold">Evidencia Adjunta</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {(() => {
                                        let images = [];
                                        if (selectedRMA.evidence_images) {
                                            try {
                                                images = JSON.parse(selectedRMA.evidence_images);
                                            } catch (e) {
                                                console.error("Error parsing evidence_images", e);
                                            }
                                        }
                                        if (!images || images.length === 0) {
                                            return <div className="text-sm text-muted-foreground col-span-2">No hay evidencia adjunta.</div>;
                                        }
                                        return images.map((img, idx) => (
                                            <AuthenticatedImage 
                                                key={idx} 
                                                src={`/api/uploads/returns/${img}`} 
                                                alt={`Evidencia ${idx + 1}`} 
                                                className="aspect-square object-cover rounded-md border border-muted-foreground/30" 
                                            />
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedRMA(null)}>Cerrar</Button>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button variant="destructive" onClick={() => handleReject(selectedRMA.id)}>Rechazar</Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedRMA.id)}>Aprobar</Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default RMAModule;