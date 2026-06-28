import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';

function SalesMetrics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-white p-6">Cargando métricas...</div>;
    if (!stats) return <div className="text-white p-6">Error al cargar métricas</div>;

    const metrics = [
        { title: 'Ingresos Totales', value: `Bs ${stats.total_revenue?.toFixed(2) || '0.00'}`, change: 'Real', icon: DollarSign, color: 'bg-green-500' },
        { title: 'Clientes Activos', value: stats.active_customers || 0, change: 'Real', icon: Users, color: 'bg-orange-500' },
        { title: 'Ganancia Estimada', value: `Bs ${stats.net_profit?.toFixed(2) || '0.00'}`, change: '30%', icon: TrendingUp, color: 'bg-purple-500' },
        { title: 'Alertas de Stock', value: stats.low_inventory || 0, change: 'Revisar', icon: ShoppingCart, color: 'bg-rose-500' }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${metric.color} p-3 rounded-lg`}>
                                <metric.icon className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-slate-400 text-xs font-semibold px-2 py-1 bg-white/5 rounded-full">{metric.change}</span>
                        </div>
                        <h3 className="text-slate-300 text-sm mb-1">{metric.title}</h3>
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                    </motion.div>
                ))}
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Top Vendedores</h2>
                <div className="space-y-4">
                    {stats.top_sellers && stats.top_sellers.length > 0 ? (
                        stats.top_sellers.map((seller, index) => (
                            <div key={seller.name} className="flex items-center gap-4">
                                <div className="bg-blue-500/20 text-blue-400 font-bold rounded-lg w-8 h-8 flex items-center justify-center">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{seller.name}</p>
                                    <p className="text-slate-400 text-sm">{seller.deals} ventas realizadas</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-bold">Bs {seller.sales?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-400">Aún no hay ventas registradas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalesMetrics;