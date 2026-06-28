import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Banknote } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, total, currency, onConfirm, isProcessing }) => {
    const [method, setMethod] = useState('cash'); // 'cash' | 'qr'
    const [amountReceived, setAmountReceived] = useState('');
    const [change, setChange] = useState(0);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setMethod('cash');
            setAmountReceived(total ? total.toString() : '');
            setChange(0);
        }
    }, [isOpen, total]);

    // Calculate change when amountReceived updates
    useEffect(() => {
        const received = parseFloat(amountReceived);
        if (!isNaN(received) && received >= total) {
            setChange(received - total);
        } else {
            setChange(0);
        }
    }, [amountReceived, total]);

    const handleConfirm = (docType) => {
        onConfirm({
            method,
            amountReceived: parseFloat(amountReceived) || total,
            change,
            documentType: docType
        });
    };

    const currencySymbol = currency === 'USD' ? '$' : 'Bs ';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-xl text-center">Procesar Pago</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 p-1 bg-slate-800 rounded-lg mb-4">
                    <button
                        onClick={() => setMethod('cash')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${method === 'cash' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Banknote className="w-4 h-4" /> Efectivo
                    </button>
                </div>

                <div className="text-center mb-6">
                    <p className="text-slate-400 text-sm">Total a Pagar</p>
                    <p className="text-4xl font-bold text-white">{currencySymbol}{total.toFixed(2)}</p>
                </div>

                {method === 'cash' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-2">
                            <Label>Dinero Recibido</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                                <Input
                                    type="number"
                                    className="pl-10 text-lg bg-slate-800 border-slate-700 text-white"
                                    placeholder="0.00"
                                    value={amountReceived}
                                    onChange={(e) => setAmountReceived(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800 rounded-lg flex justify-between items-center border border-slate-700">
                            <span className="text-slate-400 font-medium">Cambio / Vuelto</span>
                            <span className={`text-2xl font-bold ${change > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {currencySymbol}{change.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}



                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                    <Button variant="ghost" onClick={onClose} className="border border-slate-700 hover:bg-slate-800 text-slate-300">
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => handleConfirm('none')}
                        variant="outline"
                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                        disabled={isProcessing || (method === 'cash' && (parseFloat(amountReceived) || 0) < total)}
                    >
                        {isProcessing ? "Procesando..." : "Solo Guardar"}
                    </Button>
                    <Button
                        onClick={() => handleConfirm('receipt')}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                        disabled={isProcessing || (method === 'cash' && (parseFloat(amountReceived) || 0) < total)}
                    >
                        {isProcessing ? "Procesando..." : "Emitir Recibo"}
                    </Button>
                    <Button
                        onClick={() => handleConfirm('invoice')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        disabled={isProcessing || (method === 'cash' && (parseFloat(amountReceived) || 0) < total)}
                    >
                        {isProcessing ? "Procesando..." : "Emitir Factura"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentModal;
