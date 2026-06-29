import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { QrCode, UploadCloud, RefreshCw } from 'lucide-react';

const AdminQR = () => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(null);
    const [refresh, setRefresh] = useState(0);

    const methods = [
        { id: '1', title: 'Método 1 (Banco A)' },
        { id: '2', title: 'Método 2 (Banco B)' },
        { id: '3', title: 'Método 3 (Banco C)' }
    ];

    const handleFileUpload = async (event, methodId) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(methodId);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result;
            try {
                const response = await fetch('/api/settings/qr', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        method: methodId,
                        image: base64String
                    })
                });

                if (response.ok) {
                    toast({ title: 'Imagen subida exitosamente' });
                    setRefresh(prev => prev + 1);
                } else {
                    const data = await response.json();
                    toast({ title: 'Error al subir imagen', description: data.error, variant: 'destructive' });
                }
            } catch (error) {
                toast({ title: 'Error de conexión', description: error.message, variant: 'destructive' });
            } finally {
                setUploading(null);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <DashboardLayout role="admin">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Códigos QR</h1>
                    <p className="text-muted-foreground">Configura las imágenes estáticas para los 3 métodos de pago por QR.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {methods.map((method) => (
                        <Card key={method.id}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <QrCode className="h-5 w-5" />
                                    {method.title}
                                </CardTitle>
                                <CardDescription>Sube la imagen del QR de tu banco o pasarela para este método.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center space-y-4">
                                <div className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative">
                                    <img 
                                        src={`/api/uploads/qr/qr_method_${method.id}.png?t=${refresh}`} 
                                        alt={`QR Method ${method.id}`}
                                        className="object-contain w-full h-full"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                        onLoad={(e) => {
                                            e.target.style.display = 'block';
                                            if (e.target.nextSibling) {
                                                e.target.nextSibling.style.display = 'none';
                                            }
                                        }}
                                    />
                                    <div className="absolute flex-col items-center justify-center text-muted-foreground">
                                        <QrCode className="h-12 w-12 mb-2 opacity-20" />
                                        <span className="text-sm">Sin imagen cargada</span>
                                    </div>
                                </div>

                                <div className="w-full relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => handleFileUpload(e, method.id)}
                                        disabled={uploading === method.id}
                                    />
                                    <Button variant="outline" className="w-full" disabled={uploading === method.id}>
                                        {uploading === method.id ? (
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <UploadCloud className="mr-2 h-4 w-4" />
                                        )}
                                        {uploading === method.id ? 'Subiendo...' : 'Subir / Reemplazar'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminQR;
