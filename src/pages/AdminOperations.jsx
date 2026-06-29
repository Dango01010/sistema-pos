import React from 'react';
import { Helmet } from 'react-helmet-async';
import DashboardLayout from '@/components/DashboardLayout';

import RMAModule from '@/components/admin/RMAModule';

function AdminOperations() {
    return (
        <>
            <Helmet>
                <title>Solicitud de Devolución - Administrador</title>
            </Helmet>
            <DashboardLayout role="admin">
                <div className="space-y-8 pb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Solicitudes de Devolución</h1>
                        <p className="text-muted-foreground mt-1">Gestión de devoluciones y garantías (RMA).</p>
                    </div>

                    <RMAModule />
                </div>
            </DashboardLayout>
        </>
    );
}

export default AdminOperations;
