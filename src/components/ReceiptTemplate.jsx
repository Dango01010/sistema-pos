import React from 'react';

const ReceiptTemplate = ({ data }) => {
    if (!data) return null;

    const sale = data;
    const items = sale.items || [];
    const clientName = sale.client?.name || sale.client_name || 'Cliente General';
    const clientCI = sale.client?.ci_nit || sale.client_ci || '';
    const saleDate = new Date(sale.created_at);
    const formattedDate = saleDate.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = saleDate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    const receiptNum = String(sale.id).padStart(6, '0');

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = sale.total || subtotal;

    const separator = '━'.repeat(40);
    const thinSep = '─'.repeat(40);

    return (
        <div style={{
            width: '80mm',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '12px',
            color: '#000',
            backgroundColor: '#fff',
            padding: '8mm 4mm',
            margin: '0 auto',
            lineHeight: '1.5',
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <img src="/logo.png" alt="Logo" style={{ width: '60px', margin: '0 auto 8px', display: 'block', filter: 'grayscale(100%)' }} />
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px' }}>MULTIREPUESTOS</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>RAMOS</div>
                <div style={{ fontSize: '10px', marginTop: '4px', color: '#555' }}>
                    Av. Principal #123 • Tel: (591) 123-45678
                </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '3px', margin: '6px 0' }}>{separator}</div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', margin: '4px 0' }}>
                RECIBO DE VENTA
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '3px', margin: '6px 0' }}>{separator}</div>

            {/* Info */}
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Nro:</strong> {receiptNum}</span>
                    <span>{formattedDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Hora:</strong> {formattedTime}</span>
                    {sale.payment_method && (
                        <span><strong>Pago:</strong> {sale.payment_method === 'cash' ? 'Efectivo' : 'QR'}</span>
                    )}
                </div>
                <div><strong>Cliente:</strong> {clientName}</div>
                {clientCI && <div><strong>CI/NIT:</strong> {clientCI}</div>}
            </div>

            <div style={{ fontSize: '10px', letterSpacing: '1px' }}>{thinSep}</div>

            {/* Table Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', padding: '4px 0' }}>
                <span style={{ flex: '0 0 25px' }}>Qty</span>
                <span style={{ flex: 1, paddingLeft: '4px' }}>Descripción</span>
                <span style={{ flex: '0 0 60px', textAlign: 'right' }}>P.Unit</span>
                <span style={{ flex: '0 0 65px', textAlign: 'right' }}>Subtotal</span>
            </div>

            <div style={{ fontSize: '10px', letterSpacing: '1px' }}>{thinSep}</div>

            {/* Items */}
            {items.map((item, idx) => {
                const name = item.product_name || item.name || 'Producto';
                const code = item.product_code || item.code || '';
                const qty = item.quantity;
                const unitPrice = item.price;
                const lineTotal = qty * unitPrice;

                return (
                    <div key={idx} style={{ fontSize: '11px', padding: '3px 0', borderBottom: '1px dotted #ddd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ flex: '0 0 25px' }}>{qty}</span>
                            <span style={{ flex: 1, paddingLeft: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                            </span>
                            <span style={{ flex: '0 0 60px', textAlign: 'right' }}>{unitPrice.toFixed(2)}</span>
                            <span style={{ flex: '0 0 65px', textAlign: 'right', fontWeight: 'bold' }}>{lineTotal.toFixed(2)}</span>
                        </div>
                        {code && <div style={{ fontSize: '9px', color: '#888', paddingLeft: '29px' }}>Cód: {code}</div>}
                    </div>
                );
            })}

            <div style={{ fontSize: '10px', letterSpacing: '3px', margin: '6px 0' }}>{separator}</div>

            {/* Totals */}
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>Bs {subtotal.toFixed(2)}</span>
                </div>
            </div>
            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '16px', fontWeight: 'bold', padding: '6px 0',
                borderTop: '2px solid #000', borderBottom: '2px solid #000',
                margin: '4px 0 12px'
            }}>
                <span>TOTAL:</span>
                <span>Bs {total.toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>¡Gracias por su compra!</div>
                <div style={{ color: '#666', marginTop: '4px' }}>Vuelva pronto</div>
                <div style={{ fontSize: '9px', color: '#999', marginTop: '8px', fontStyle: 'italic' }}>
                    Este documento no es una factura fiscal
                </div>
            </div>
        </div>
    );
};

export default ReceiptTemplate;
