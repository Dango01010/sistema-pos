import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Printer, Scan, Download, Type, Copy, RefreshCw, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function BarcodeModule() {
    const { toast } = useToast();
    const [selectedProduct, setSelectedProduct] = useState('');
    const [barcodeType, setBarcodeType] = useState("Code128");
    const [barcodeValue, setBarcodeValue] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [products, setProducts] = useState([]);

    // Fetch products
    useEffect(() => {
        fetch('/api/products')
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error(err));
    }, []);

    const handleProductSelect = (value) => {
        const product = products.find(p => p.id.toString() === value);
        if (product) {
            setSelectedProduct(value);
            setBarcodeValue(product.code);
            toast({ description: `Código cargado para ${product.name} (${product.brand})` });
        }
    };

    const handlePrint = () => {
        if (!barcodeValue) {
            toast({ title: "Error", description: "Seleccione un producto primero.", variant: "destructive" });
            return;
        }

        const product = products.find(p => p.code === barcodeValue);
        const displayName = product ? `${product.name} - ${product.brand}` : 'Producto';

        const printWindow = window.open('', '', 'width=600,height=400');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Etiqueta - ${barcodeValue}</title>
                    <style>
                        body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: monospace; }
                        .barcode-container { text-align: center; border: 1px dashed #000; padding: 20px; }
                        .barcode-lines { display: flex; height: 80px; justify-content: center; gap: 2px; }
                        .bar { background: black; }
                        .code { font-size: 24px; font-weight: bold; margin-top: 10px; letter-spacing: 5px; }
                        .product-name { font-size: 14px; margin-bottom: 5px; font-family: sans-serif; font-weight: bold; }
                        .brand-name { font-size: 12px; margin-bottom: 10px; font-family: sans-serif; }
                    </style>
                </head>
                <body>
                    <div class="barcode-container">
                        <div class="product-name">${product ? product.name : 'Unknown'}</div>
                        <div class="brand-name">${product ? product.brand : ''}</div>
                        <div class="barcode-lines">
                             ${barcodeValue.split('').map(() => `<div class="bar" style="width: ${Math.max(2, Math.random() * 6)}px"></div>`).join('')}
                        </div>
                        <div class="code">${barcodeValue}</div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    const handleScanToggle = () => {
        setIsScanning(!isScanning);
        if (!isScanning) {
            toast({ title: 'Cámara activada', description: 'Escanee un código de barras ahora.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Gestión de Códigos</h2>
                    <p className="text-muted-foreground">Generación de etiquetas para productos.</p>
                </div>
            </div>

            <Tabs defaultValue="generate" className="w-full">
                <TabsList className="bg-muted p-1 rounded-xl w-full sm:w-auto flex">
                    <TabsTrigger value="generate" className="flex-1">Generador de Etiquetas</TabsTrigger>
                    <TabsTrigger value="scan" className="flex-1">Scanner</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-panel p-6 rounded-2xl space-y-6">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Barcode className="w-5 h-5" /> Configuración de Etiqueta
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <Label className="text-sm font-medium">Formato Estándar</Label>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold">Code 128</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Formato universal optimizado para lectores láser y cámaras. Compatible con caracteres alfanuméricos.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Seleccionar Producto</Label>
                                    <Select
                                        value={selectedProduct}
                                        onValueChange={handleProductSelect}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Buscar producto en inventario..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>
                                                    {p.name} <span className="text-muted-foreground ml-2">({p.brand})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Valor del Código (SKU Generado)</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 px-3 py-2 bg-muted rounded-md border text-sm font-mono text-muted-foreground">
                                            {barcodeValue || 'Seleccione un producto...'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button className="flex-1" onClick={handlePrint} disabled={!barcodeValue}>
                                    <Printer className="w-4 h-4 mr-2" /> Imprimir
                                </Button>
                                <Button variant="outline" className="flex-1" disabled={!barcodeValue}>
                                    <Download className="w-4 h-4 mr-2" /> Guardar
                                </Button>
                            </div>
                        </div>

                        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center bg-white/5">
                            {barcodeValue ? (
                                <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm transform hover:scale-105 transition-transform duration-300">
                                    <h4 className="text-center text-black font-semibold text-sm mb-1 border-b pb-2">
                                        {products.find(p => p.code === barcodeValue)?.name}
                                    </h4>
                                    <p className="text-center text-xs text-gray-500 mb-3 font-bold uppercase">
                                        {products.find(p => p.code === barcodeValue)?.brand}
                                    </p>
                                    <div className="h-24 w-full flex items-end justify-center gap-[2px] px-2 mb-2">
                                        {barcodeValue.split('').map((char, i) => (
                                            <div key={i} className="bg-black" style={{ width: Math.max(3, Math.random() * 8) + 'px', height: '100%' }}></div>
                                        ))}
                                    </div>
                                    <div className="text-center font-mono text-black font-bold tracking-[0.3em] text-lg">
                                        {barcodeValue}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center p-8 border-2 border-dashed border-muted-foreground/20 rounded-xl">
                                    <Barcode className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground">Seleccione un producto para ver la previsualización</p>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-6 text-center">
                                Vista previa aproximada. La impresión final será de alta resolución.
                            </p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="scan" className="glass-panel p-6 rounded-2xl">
                    <div className="flex flex-col items-center py-8">
                        <div className={`relative w-64 h-64 rounded-3xl border-2 overflow-hidden mb-6 transition-colors ${isScanning ? 'border-primary shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-muted'}`}>
                            {isScanning ? (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <div className="w-full h-0.5 bg-red-500 absolute top-1/2 animate-pulse shadow-[0_0_10px_red]" />
                                    <span className="text-xs text-white absolute bottom-4">Buscando código...</span>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                                    <Scan className="w-12 h-12 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button size="lg" onClick={handleScanToggle} variant={isScanning ? "destructive" : "default"}>
                                {isScanning ? 'Detener Escaneo' : 'Activar Cámara'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default BarcodeModule;