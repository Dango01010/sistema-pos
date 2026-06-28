import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, DollarSign, ShoppingBag, AlertTriangle, ArrowDownRight, Download } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination.jsx';
import { Button } from '@/components/ui/button';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

function AdminReports() {
    const [stats, setStats] = useState({
        total_revenue: 0,
        total_sales_count: 0,
        low_stock_count: 0,
        total_refunds: 0
    });
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [categorySales, setCategorySales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentPageReturns, setCurrentPageReturns] = useState(1);

    const ITEMS_PER_PAGE = 15;
    const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE);
    const paginatedSales = sales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const totalPagesReturns = Math.ceil(returns.length / ITEMS_PER_PAGE);
    const paginatedReturns = returns.slice((currentPageReturns - 1) * ITEMS_PER_PAGE, currentPageReturns * ITEMS_PER_PAGE);

    const handleExportData = () => {
        if (!sales || sales.length === 0) {
            alert("No hay datos para exportar");
            return;
        }

        // Group by month
        const groupedSales = {};
        sales.forEach(sale => {
            const date = new Date(sale.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!groupedSales[monthKey]) {
                groupedSales[monthKey] = { transactions: [], total: 0 };
            }
            groupedSales[monthKey].transactions.push(sale);
            groupedSales[monthKey].total += sale.total;
        });
        
        const csvRows = [];
        
        // Sort months descending (most recent first)
        const sortedMonths = Object.keys(groupedSales).sort((a, b) => b.localeCompare(a));

        sortedMonths.forEach(monthKey => {
            const [year, month] = monthKey.split("-");
            const date = new Date(year, parseInt(month) - 1);
            let monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            // Month Header
            csvRows.push(`Mes: ${monthName},,,,`);
            // Columns Headers
            csvRows.push(`ID Venta,Fecha,Vendedor,Total (Bs),`);
            
            const monthData = groupedSales[monthKey];
            // Sort transactions within the month (descending by date)
            monthData.transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            monthData.transactions.forEach(sale => {
                const dateStr = new Date(sale.created_at).toLocaleString().replace(/,/g, '');
                const vendor = sale.vendor_name || 'Desconocido';
                csvRows.push(`${sale.id},${dateStr},${vendor},${sale.total},`);
            });
            
            // Subtotal Row
            csvRows.push(`Total ${monthName},,,${monthData.total.toFixed(2)},`);
            // Empty row separator
            csvRows.push(`,,,,`);
        });
        
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("download", "reporte_ventas_detallado.csv");
        a.click();
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsResponse = await fetch('/api/reports/stats');
                const statsData = await statsResponse.json();
                setStats(statsData);

                const salesResponse = await fetch('/api/reports/sales');
                const salesData = await salesResponse.json();
                setSales(salesData);

                const returnsResponse = await fetch('/api/returns');
                const returnsData = await returnsResponse.json();
                setReturns(returnsData.filter(r => ['Aprobado', 'Completado', 'approved'].includes(r.status)));

                const categoryResponse = await fetch('/api/reports/sales-by-category');
                if(categoryResponse.ok) {
                    const categoryData = await categoryResponse.json();
                    setCategorySales(categoryData);
                }
            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (amount) => {
        return `Bs ${new Intl.NumberFormat('en-US').format(amount)}`;
    };

    return (
        <>
            <Helmet>
                <title>Reportes - Admin</title>
            </Helmet>
            <DashboardLayout role="admin">
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Reportes y Estadísticas</h1>
                            <p className="text-muted-foreground mt-1">Resumen general del rendimiento del negocio.</p>
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                variant="outline" 
                                className="glass-card text-foreground border-border hover:bg-accent"
                                onClick={handleExportData}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar Data
                            </Button>
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loading ? '...' : formatCurrency(stats.total_revenue)}</div>
                                <p className="text-xs text-muted-foreground">Ventas históricas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{loading ? '...' : stats.total_sales_count}</div>
                                <p className="text-xs text-muted-foreground">Transacciones completadas</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-rose-500">{loading ? '...' : stats.low_stock_count}</div>
                                <p className="text-xs text-muted-foreground">Productos con bajo stock</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Dinero Devuelto</CardTitle>
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-500">{loading ? '...' : formatCurrency(stats.total_refunds || 0)}</div>
                                <p className="text-xs text-muted-foreground">Salidas por devoluciones</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sales By Category Section */}
                    <Card className="col-span-4 mt-8">
                        <CardHeader>
                            <CardTitle>Análisis de Ventas por Categoría</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!loading && categorySales.length > 0 && (
                                <div className="h-72 w-full mb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={categorySales} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                            <XAxis dataKey="category" stroke="#94a3b8" />
                                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                                            <Bar yAxisId="left" dataKey="total_quantity" name="Unidades" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar yAxisId="right" dataKey="total_revenue" name="Ingresos (Bs)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3">Categoría</th>
                                            <th className="px-4 py-3 text-center">Unidades Vendidas</th>
                                            <th className="px-4 py-3 text-right">Ingresos Generados</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="3" className="text-center py-4">Cargando...</td></tr>
                                        ) : categorySales.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center py-4">No hay datos de ventas por categoría</td></tr>
                                        ) : (
                                            categorySales.map((cat, idx) => (
                                                <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium capitalize">{cat.category}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded text-xs font-semibold">
                                                            {cat.total_quantity} uds.
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-500">
                                                        {formatCurrency(cat.total_revenue)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Sales Table */}
                    <Card className="col-span-4 mt-8">
                        <CardHeader>
                            <CardTitle>Ventas Recientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3">ID Venta</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Vendedor</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4" className="text-center py-4">Cargando...</td></tr>
                                        ) : sales.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-4">No hay ventas registradas</td></tr>
                                        ) : (
                                            paginatedSales.map((sale) => (
                                                <tr key={sale.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">#{sale.id}</td>
                                                    <td className="px-4 py-3">{new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-semibold">
                                                            {sale.vendor_name || 'Desconocido'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-500">
                                                        {formatCurrency(sale.total)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <Pagination 
                                    currentPage={currentPage} 
                                    totalPages={totalPages} 
                                    onPageChange={setCurrentPage} 
                                />
                            </div>
                        </CardContent>
                    </Card>


                    {/* Recent Returns Table */}
                    <Card className="col-span-4 mt-8">
                        <CardHeader>
                            <CardTitle>Devoluciones Recientes (Salidas de Caja)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3">ID RMA</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Cliente</th>
                                            <th className="px-4 py-3">Motivo</th>
                                            <th className="px-4 py-3 text-right">Total Devuelto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="5" className="text-center py-4">Cargando...</td></tr>
                                        ) : returns.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-4">No hay devoluciones registradas</td></tr>
                                        ) : (
                                            paginatedReturns.map((rma) => (
                                                <tr key={rma.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">RMA-{rma.id}</td>
                                                    <td className="px-4 py-3">{rma.date}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{rma.client}</td>
                                                    <td className="px-4 py-3"><span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs">{rma.reason}</span></td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-500">
                                                        - {formatCurrency(rma.total)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {returns.length > 0 && (
                                <div className="mt-4">
                                    <Pagination 
                                        currentPage={currentPageReturns} 
                                        totalPages={totalPagesReturns} 
                                        onPageChange={setCurrentPageReturns} 
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        </>
    );
}

export default AdminReports;
