import React from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';
import UserManagement from '@/components/admin/UserManagement';

function AdminUsers() {
    return (
        <>
            <Helmet>
                <title>Usuarios - Admin</title>
            </Helmet>
            <DashboardLayout role="admin">
                <div className="space-y-8 pb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestión de Usuarios</h1>
                        <p className="text-muted-foreground mt-1">Administración de personal y permisos.</p>
                    </div>
                    <UserManagement />
                </div>
            </DashboardLayout>
        </>
    );
}

export default AdminUsers;
