import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useAuth } from '@/contexts/AuthContext';

function VendedorHistory() {
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.id) {
            fetch(`/api/sales/my-sales?user_id=${user.id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Network response was not ok");
                    return res.json();
                })
                .then(data => {
                    setSales(Array.isArray(data) ? data : []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching user sales:", err);
                    setLoading(false);
                });
        }
    }, [user]);

    const formatCurrency = (amount) => {
        const num = Number(amount);
        return `Bs ${isNaN(num) ? '0.00' : num.toFixed(2)}`;
    };

    return (
        <>
            <Helmet>
                <title>Mis Ventas - Vendedor</title>
            </Helmet>
            <DashboardLayout role="vendedor">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Historial de Ventas</h1>
                        <p className="text-muted-foreground mt-1">Registro de tus ventas realizadas.</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mis Ventas Recientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3">ID Venta</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3 text-right">Monto Total</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">Cargando historial...</td></tr>
                                        ) : sales.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-8 text-muted-foreground">No has realizado ventas aún.</td></tr>
                                        ) : (
                                            sales.map((sale) => (
                                                <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">#{sale.id}</td>
                                                    <td className="px-4 py-3">
                                                        {new Date(sale.created_at).toLocaleDateString()} <span className="text-muted-foreground text-xs">{new Date(sale.created_at).toLocaleTimeString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-500">
                                                        {formatCurrency(sale.total)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                            Completada
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </>
    );
}

export default VendedorHistory;
