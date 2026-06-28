import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminInventory from '@/pages/AdminInventory';
import AdminOperations from '@/pages/AdminOperations';
import AdminUsers from '@/pages/AdminUsers';
import AdminPOS from '@/pages/AdminPOS';
import PrintQuotation from '@/pages/PrintQuotation';
import PrintReceipt from '@/pages/PrintReceipt';
import PrintInvoice from '@/pages/PrintInvoice';


import AdminReports from '@/pages/AdminReports';
import VendedorHistory from '@/pages/VendedorHistory';
import VendedorDashboard from '@/pages/VendedorDashboard';

import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

function AppRoutes() {
    const { user } = useAuth();

    return (
        <>
            <Helmet>
                <title>Sistema de Gestión de Autopartes</title>
                <meta name="description" content="Sistema completo de gestión empresarial para negocios de autopartes con control de inventario, ventas y usuarios" />
            </Helmet>
            <Routes>
                <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPage />} />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/inventory"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminInventory />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/operations"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminOperations />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/pos"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminPOS />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/users"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminUsers />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/reports"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminReports />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/vendedor"
                    element={
                        <ProtectedRoute allowedRoles={['vendedor']}>
                            <VendedorDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/vendedor/returns"
                    element={
                        <ProtectedRoute allowedRoles={['vendedor']}>
                            <VendedorDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/vendedor/scan"
                    element={
                        <ProtectedRoute allowedRoles={['vendedor']}>
                            <VendedorDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/vendedor/history"
                    element={
                        <ProtectedRoute allowedRoles={['vendedor']}>
                            <VendedorHistory />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/print/quote/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
                            <PrintQuotation />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/print/receipt/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
                            <PrintReceipt />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/print/invoice/:id"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
                            <PrintInvoice />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <HelmetProvider>
                    <AppRoutes />
                    <Toaster />
                </HelmetProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;