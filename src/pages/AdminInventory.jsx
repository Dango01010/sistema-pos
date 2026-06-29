import React from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';
import InventoryModule from '@/components/admin/InventoryModule';
import BarcodeModule from '@/components/admin/BarcodeModule';

function AdminInventory() {
    return (
        <>
            <Helmet>
                <title>Inventario - Administrador</title>
            </Helmet>
            <DashboardLayout role="admin">
                <div className="space-y-8 pb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario y Codigo de producto</h1>
                        <p className="text-muted-foreground mt-1">Gestión de stock y catalogación.</p>
                    </div>
                    <InventoryModule />
                    <BarcodeModule />
                </div>
            </DashboardLayout>
        </>
    );
}

export default AdminInventory;
