import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import {
    TrendingUp, Users, DollarSign, Package, AlertTriangle, Download, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Modules
import SellerLeaderboard from '@/components/admin/SellerLeaderboard';



function StatCard({ title, value, subtext, icon: Icon, trend, color, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="glass-card rounded-2xl p-4 md:p-6 relative overflow-hidden group"
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${color} opacity-[0.08] group-hover:scale-125 transition-transform duration-500`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary`}>
                    <Icon className="w-5 h-5" />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${trend > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
                <p className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            </div>
        </motion.div>
    );
}

function AdminDashboard() {
    const [period, setPeriod] = useState('all'); // 'all', 'monthly', 'daily'
    const [stats, setStats] = useState({
        total_revenue: 0,
        net_profit: 0,
        active_customers: 0,
        low_inventory: 0,
        top_sellers: []
    });
    const [salesData, setSalesData] = useState([]);

    useEffect(() => {
        // Fetch dashboard stats with period filter
        fetch(`/api/dashboard/stats?period=${period}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));

        // Fetch sales timeline for chart with period filter
        fetch(`/api/reports/sales-timeline?period=${period}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => setSalesData(data))
            .catch(err => console.error(err));
    }, [period]);


    return (
        <>
            <Helmet>
                <title>Panel Administrativo - Multirepuestos Ramos</title>
            </Helmet>
            <DashboardLayout role="admin">
                <div className="space-y-8 pb-10">

                    {/* Top Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Panel <span className="premium-text-gradient">Principal</span>
                            </h1>
                            <p className="text-muted-foreground mt-1">Visión general del rendimiento y gestión empresarial.</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="relative flex items-center shadow-lg shadow-primary/20 rounded-md bg-primary text-primary-foreground focus-within:ring-2 ring-offset-2 ring-primary">
                                <Calendar className="w-4 h-4 ml-4 mr-2" />
                                <select 
                                    className="appearance-none bg-transparent py-2 pr-8 pl-1 outline-none text-sm font-medium cursor-pointer"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                >
                                    <option value="daily" className="text-black bg-white">Diario</option>
                                    <option value="monthly" className="text-black bg-white">Mensual</option>
                                    <option value="all" className="text-black bg-white">Histórico Total</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <StatCard title="Ingresos Totales" value={`Bs ${stats.total_revenue.toLocaleString()}`} subtext="Ingresos brutos" icon={DollarSign} trend={14.5} color="bg-blue-500" delay={0.1} />
                        <StatCard title="Beneficio Neto (Est.)" value={`Bs ${stats.net_profit.toLocaleString()}`} subtext="Margen estimado 30%" icon={TrendingUp} trend={8.2} color="bg-emerald-500" delay={0.2} />
                        <StatCard title="Transacciones" value={stats.active_customers} subtext="Total de ventas realizadas" icon={Users} trend={3.8} color="bg-purple-500" delay={0.3} />
                        <StatCard title="Inventario Bajo" value={`${stats.low_inventory} Items`} subtext="Requiere reabastecimiento" icon={AlertTriangle} trend={-12} color="bg-amber-500" delay={0.4} />
                    </div>

                    {/* Main Content Tabs */}
                    {/* Main Content */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 glass-panel p-4 md:p-6 rounded-2xl min-h-[350px] md:min-h-[400px]">
                                <h2 className="text-xl font-bold text-foreground mb-4">Análisis de Ingresos</h2>
                                <div className="h-[250px] md:h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesData}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Bs ${value}`} />
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} />
                                            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="glass-panel p-6 rounded-2xl">
                                    <h3 className="font-bold mb-4">Mejores Vendedores</h3>
                                    <SellerLeaderboard sellers={stats.top_sellers} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
}

export default AdminDashboard;