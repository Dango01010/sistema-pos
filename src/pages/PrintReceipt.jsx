import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReceiptTemplate from '@/components/ReceiptTemplate';

function PrintReceipt() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [saleData, setSaleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`/api/sales/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("No se pudo cargar la venta");
                return res.json();
            })
            .then(data => {
                setSaleData(data);
                setLoading(false);
                setTimeout(() => {
                    window.print();
                }, 500);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="flex items-center justify-center h-screen">Cargando recibo...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 print:bg-white print:p-0 print:block">
            <div className="mb-4 print:hidden">
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 shadow flex items-center gap-2"
                >
                    Volver al Sistema
                </button>
            </div>
            <ReceiptTemplate data={saleData} />
        </div>
    );
}

export default PrintReceipt;
