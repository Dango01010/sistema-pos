import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LogOut, Menu, X, LayoutDashboard, Box, ShoppingCart, Users,
    BarChart3, ArrowRightLeft, AlertTriangle, Car, QrCode, FileText,
    RotateCcw, Sun, Moon, Bell, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

function DashboardLayout({ children, role }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'dark';
    });
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsMobile(true);
                setSidebarOpen(false);
            } else {
                setIsMobile(false);
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Fetch notifications
        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications');
                if (res.ok) {
                    const data = await res.json();
                    const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
                    const filteredData = data.filter(n => !dismissed.includes(n.id));
                    setNotifications(filteredData);
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            }
        };

        fetchNotifications();
        // Poll every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const dismissNotification = (id, e) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
        const dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
        if (!dismissed.includes(id)) {
            dismissed.push(id);
            localStorage.setItem('dismissed_notifications', JSON.stringify(dismissed));
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = {
        admin: [
            { icon: LayoutDashboard, label: 'Vista General', path: '/admin' },
            { icon: Box, label: 'Inventario & Catálogo', path: '/admin/inventory' },
            { icon: ArrowRightLeft, label: 'Solicitudes de Devolución', path: '/admin/operations' },
            { icon: ShoppingCart, label: 'Ventas & POS', path: '/admin/pos' },
            { icon: Users, label: 'Usuarios & RRHH', path: '/admin/users' },
            { icon: FileText, label: 'Reportes', path: '/admin/reports' },
            { icon: QrCode, label: 'Códigos QR', path: '/admin/qr-settings' }
        ],
        vendedor: [
            { icon: ShoppingCart, label: 'Punto de Venta', path: '/vendedor' },
            { icon: RotateCcw, label: 'Devoluciones (RMA)', path: '/vendedor/returns' },
            { icon: QrCode, label: 'Escanear Producto', path: '/vendedor/scan' },
            { icon: BarChart3, label: 'Mis Ventas', path: '/vendedor/history' }
        ]
    };

    const currentMenu = menuItems[role] || [];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 transition-colors duration-300">
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />

            {/* Top Navigation */}
            <nav className="relative z-50 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                            >
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center gap-3">
                                <img src="/logo.png" alt="Logo Multirepuesto Ramos" className="w-10 h-10 object-contain drop-shadow-md" />
                                <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground hidden sm:block">
                                    Multirepuestos Ramos
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notifications & Theme */}
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
                                    {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                </Button>

                                <div className="relative">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground relative"
                                        onClick={() => setShowNotifications(!showNotifications)}
                                    >
                                        <Bell className="w-5 h-5" />
                                        {notifications.length > 0 && (
                                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        )}
                                    </Button>

                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
                                            >
                                                <div className="p-4 border-b border-border flex justify-between items-center">
                                                    <h3 className="font-semibold">Notificaciones</h3>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowNotifications(false)}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="max-h-[400px] overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="p-8 text-center text-muted-foreground">
                                                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p>No tienes notificaciones nuevas</p>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-border">
                                                            {notifications.map((notification) => (
                                                                <div key={notification.id} className="p-4 hover:bg-accent/50 transition-colors flex gap-3">
                                                                    <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${notification.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'
                                                                        }`}>
                                                                        <AlertTriangle className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm font-medium">{notification.title}</h4>
                                                                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                                                        <span className="text-xs text-muted-foreground mt-2 block">{notification.timestamp}</span>
                                                                    </div>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-6 w-6 p-0 ml-auto opacity-50 hover:opacity-100" 
                                                                        onClick={(e) => dismissNotification(notification.id, e)}
                                                                        title="Descartar notificación"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="h-8 w-[1px] bg-border mx-2" />

                            <div className="text-right hidden sm:block mr-2">
                                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${role === 'admin' ? 'bg-purple-500' :
                                        role === 'vendedor' ? 'bg-green-500' : 'bg-orange-500'
                                        }`} />
                                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                                </div>
                            </div>
                            <ChangePasswordDialog triggerClassName="text-muted-foreground hover:text-foreground" />
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex relative z-10 pt-0">
                {/* Sidebar */}
                <AnimatePresence mode="wait">
                    {sidebarOpen && (
                        <motion.aside
                            initial={isMobile ? { x: -280, opacity: 0 } : { x: -280, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={isMobile ? { x: -280, opacity: 0 } : { x: -280, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed left-0 top-16 bottom-0 w-64 bg-background/95 border-r border-border p-4 overflow-y-auto z-40 backdrop-blur-sm shadow-xl lg:shadow-none"
                        >
                            <div className="space-y-1">
                                {currentMenu.map((item, index) => {
                                    const isActive = location.pathname === item.path || (item.path !== `/${role}` && location.pathname.startsWith(item.path));
                                    return (
                                        <motion.button
                                            key={item.label}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => navigate(item.path === `/${role}` ? item.path : `${item.path}`)} // Simple navigation handling
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                                ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                                }`}
                                        >
                                            <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                            <span>{item.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeIndicator"
                                                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                                                />
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="absolute bottom-4 left-4 right-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-card to-background border border-border shadow-sm">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estado</h4>
                                    <div className="flex justify-between items-center text-xs text-muted-foreground">

                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-green-500 font-medium">Online</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    )}

                </AnimatePresence>

                {/* Mobile Overlay Backdrop */}
                {isMobile && sidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main
                    className={`flex-1 min-h-[calc(100vh-4rem)] transition-all duration-300 ${sidebarOpen && !isMobile ? 'lg:ml-64' : 'ml-0'
                        }`}
                >
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            {children}
                        </motion.div>
                    </div>
                </main>
            </div>
        </div >
    );
}

export default DashboardLayout;