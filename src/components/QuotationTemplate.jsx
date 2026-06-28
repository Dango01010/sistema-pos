import React from 'react';

const QuotationTemplate = ({ data }) => {
    if (!data) return null;

    const { id, created_at, client, items, total, status, origin, delivery_date, validity_date, payment_type } = data;
    const clientName = client?.name || 'Cliente General';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    const clientCI = client?.ci_nit || '';
    const quoteNum = String(id).padStart(6, '0');

    const quoteDate = new Date(created_at);
    const formattedDate = quoteDate.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });

    // Calculate from items
    const rawSubtotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const ivaRate = 0.13;
    const calculatedIva = rawSubtotal * ivaRate;
    const finalTotal = total || (rawSubtotal + calculatedIva);

    // Validity: 7 days from creation or custom
    let formattedValidUntil = validity_date;
    if (!formattedValidUntil) {
        const validUntil = new Date(quoteDate);
        validUntil.setDate(validUntil.getDate() + 7);
        formattedValidUntil = validUntil.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    return (
        <div style={{
            width: '21cm',
            minHeight: '29.7cm',
            margin: '0 auto',
            backgroundColor: '#fff',
            color: '#1e293b',
            fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Top Accent Bar */}
            <div style={{
                height: '8px',
                background: 'linear-gradient(to right, #eab308, #f59e0b, #eab308)',
            }} />

            {/* Content */}
            <div style={{ padding: '40px 48px' }}>

                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
                    <div>
                        <div style={{
                            width: '56px', height: '56px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '28px', fontWeight: 'bold', color: '#ca8a04',
                            border: '2px solid #fde68a',
                            marginBottom: '8px',
                        }}>M</div>
                        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, lineHeight: 1.2 }}>
                            Multirepuestos<br />Ramos
                        </h1>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                            Av. Principal #123 • Tel: (591) 123-45678
                        </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{
                            display: 'inline-block',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                            marginBottom: '8px',
                        }}>COTIZACIÓN</div>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 4px', color: '#1e293b' }}>
                            N° {quoteNum}
                        </p>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{formattedDate}</p>
                    </div>
                </div>

                {/* Info Boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                    {/* Client Info Box */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px 24px',
                    }}>
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Datos del Cliente
                        </p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#ca8a04', margin: '0 0 4px' }}>{clientName}</p>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: '#475569' }}>
                            {clientCI && <span>CI/NIT: {clientCI}</span>}
                            {clientEmail && <span>✉ {clientEmail}</span>}
                            {clientPhone && <span>📞 {clientPhone}</span>}
                        </div>
                    </div>

                    {/* Extra Details Box */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px 24px',
                    }}>
                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                            Detalles Adicionales
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', color: '#475569' }}>
                            {origin && <div><span style={{fontWeight: 'bold', color: '#1e293b'}}>Procedencia:</span><br/>{origin}</div>}
                            {delivery_date && <div><span style={{fontWeight: 'bold', color: '#1e293b'}}>Entrega:</span><br/>{delivery_date}</div>}
                            {payment_type && <div><span style={{fontWeight: 'bold', color: '#1e293b'}}>Pago:</span><br/>{payment_type}</div>}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1e293b' }}>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, borderRadius: '8px 0 0 0' }}>Código</th>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Descripción</th>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Marca</th>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Cant.</th>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>P. Unitario</th>
                            <th style={{ color: '#fff', padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, borderRadius: '0 8px 0 0' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const itemName = item.name || item.product_name || 'Producto';
                            const itemCode = item.code || item.product_code || '---';
                            const itemBrand = item.brand || '---';
                            return (
                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 16px', fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{itemCode}</td>
                                    <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>{itemName}</td>
                                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#64748b' }}>{itemBrand}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>{item.quantity}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '13px', color: '#475569' }}>Bs {item.price.toFixed(2)}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Bs {(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                    <div style={{ width: '260px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#64748b' }}>
                            <span style={{ fontWeight: 'bold', color: '#ca8a04' }}>SUBTOTAL:</span>
                            <span>Bs {rawSubtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px', color: '#64748b' }}>
                            <span style={{ fontWeight: 'bold' }}>IVA (13%):</span>
                            <span>Bs {calculatedIva.toFixed(2)}</span>
                        </div>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '10px 12px', marginTop: '8px',
                            backgroundColor: '#1e293b', borderRadius: '8px',
                            color: '#fff', fontSize: '16px', fontWeight: 'bold',
                        }}>
                            <span>TOTAL:</span>
                            <span>Bs {finalTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '40px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '280px' }}>
                        <p style={{ fontWeight: 'bold', color: '#ca8a04', marginBottom: '4px' }}>Nota:</p>
                        <p style={{ margin: 0, lineHeight: 1.5 }}>
                            Esta cotización es válida hasta el <strong>{formattedValidUntil}</strong>.
                            Los precios pueden estar sujetos a disponibilidad de stock.
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '180px', borderTop: '1px solid #94a3b8', marginBottom: '4px' }} />
                        <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', margin: 0 }}>Multirepuestos Ramos</p>
                    </div>
                </div>
            </div>

            {/* Bottom Accent Bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: '48px',
                background: 'linear-gradient(to right, #eab308, #f59e0b, #eab308)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px',
                color: '#fff', fontSize: '12px', fontWeight: 500,
            }}>
                <span>📞 (591) 123-45678</span>
                <span>✉ ventas@multirepuestosramos.com</span>
            </div>
        </div>
    );
};

export default QuotationTemplate;
