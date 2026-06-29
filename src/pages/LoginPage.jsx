import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Car, User, Lock, ArrowRight, ShieldCheck, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

function LoginPage() {
    const [selectedRole, setSelectedRole] = useState('admin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" });
            return;
        }

        setLoading(true);
        const success = await login(username, password, selectedRole);
        setLoading(false);

        if (success) {
            navigate(`/${selectedRole}`);
        } else {
            toast({ title: 'Error de autenticación', description: 'Usuario o contraseña incorrectos', variant: 'destructive' });
        }
    };

    const roles = [
        { id: 'admin', label: 'Admin', icon: ShieldCheck },
        { id: 'vendedor', label: 'Ventas', icon: ShoppingBag }
    ];

    return (
        <>
            <Helmet>
                <title>Login</title>
            </Helmet>
            <div className="min-h-screen flex w-full bg-slate-950 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-600/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[100px]" />
                </div>

                {/* Left Side - Visual */}
                <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative z-10">
                    <div className="max-w-xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                        >
                            <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain" />
                            <span className="text-sm font-medium text-slate-300">Multirepuestos Ramos</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-6xl font-bold text-white mb-6 leading-tight"
                        >
                            Calidad de respuesto para tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Maquinaria</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-xl text-slate-400 mb-8 leading-relaxed"
                        >
                            Venta especializada de repuestos para maquinaria pesada y vehículos. Soluciones integrales para tu flota.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="grid grid-cols-2 gap-6"
                        >
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <h3 className="text-white font-bold mb-1">Repuestos Maquinaria</h3>
                                <p className="text-sm text-slate-400">Componentes de alta durabilidad</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                <h3 className="text-white font-bold mb-1">Repuestos Vehículos</h3>
                                <p className="text-sm text-slate-400">Amplio catálogo multimarca</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-8 z-20">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
                    >
                        <div className="text-center mb-8">
                            <div className="inline-flex p-3 rounded-2xl bg-yellow-600/20 text-yellow-500 mb-4">
                                <Car className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
                            <p className="text-slate-400 text-sm mt-2">Ingresa tus credenciales para acceder</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            {/* Role Selector */}
                            <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-xl">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setSelectedRole(role.id)}
                                        className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg text-xs font-medium transition-all duration-200 ${selectedRole === role.id
                                            ? 'bg-yellow-600 text-white shadow-lg'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                            }`}
                                    >
                                        <role.icon className="w-5 h-5 mb-1.5" />
                                        {role.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Usuario</label>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent transition-all"
                                            placeholder="Ej. admin"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300 ml-1">Contraseña</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-semibold py-6 rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98]"
                            >
                                {loading ? 'Ingresando...' : 'Ingresar al Sistema'}
                                {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                            </Button>
                        </form>
                    </motion.div>
                </div>
            </div>
        </>
    );
}

export default LoginPage;