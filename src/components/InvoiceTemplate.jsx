import React from 'react';

const InvoiceTemplate = ({ data }) => {
    if (!data) return null;

    const sale = data;
    const items = sale.items || [];
    const clientName = sale.client?.name || sale.client_name || 'S/N';
    const clientCI = sale.client?.ci_nit || sale.client_ci || '0';
    const clientPhone = sale.client?.phone || sale.client_phone || '';
    const saleDate = new Date(sale.created_at);
    const formattedDate = saleDate.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = saleDate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    const invoiceNum = String(sale.id).padStart(6, '0');

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const iva = subtotal * 0.13;
    const total = sale.total || subtotal;

    // Simulated fiscal codes (replace with real ones when integrated with SIN)
    const authCode = `29040011007-${invoiceNum}`;
    const controlCode = `${invoiceNum.slice(0,2)}-${invoiceNum.slice(2,4)}-A3-4F`;

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
                <div style={{ fontSize: '10px', marginTop: '2px', color: '#555' }}>
                    Casa Matriz
                </div>
                <div style={{ fontSize: '10px', color: '#555' }}>
                    Av. Principal #123
                </div>
                <div style={{ fontSize: '10px', color: '#555' }}>
                    Tel: (591) 123-45678
                </div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '4px' }}>
                    NIT: 1234567890
                </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '3px', margin: '4px 0' }}>{separator}</div>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', margin: '4px 0', letterSpacing: '3px' }}>
                FACTURA
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '2px' }}>
                <strong>N°:</strong> {invoiceNum}
            </div>
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginBottom: '2px' }}>
                AUTORIZACIÓN N°: {authCode}
            </div>

            <div style={{ textAlign: 'center', fontSize: '10px', letterSpacing: '3px', margin: '4px 0' }}>{separator}</div>

            {/* Client / Date Info */}
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                <div><strong>Fecha:</strong> {formattedDate} {formattedTime}</div>
                <div><strong>Señor(es):</strong> {clientName}</div>
                <div><strong>NIT/CI:</strong> {clientCI}</div>
                {clientPhone && <div><strong>Teléfono:</strong> {clientPhone}</div>}
            </div>

            <div style={{ fontSize: '10px', letterSpacing: '1px' }}>{thinSep}</div>

            {/* Table Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', padding: '4px 0' }}>
                <span style={{ flex: '0 0 25px' }}>Qty</span>
                <span style={{ flex: 1, paddingLeft: '4px' }}>Detalle</span>
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
            <div style={{ fontSize: '11px', marginBottom: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>Bs {subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                    <span>IVA (13%):</span>
                    <span>Bs {iva.toFixed(2)}</span>
                </div>
            </div>

            <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '16px', fontWeight: 'bold', padding: '6px 0',
                borderTop: '2px solid #000', borderBottom: '2px solid #000',
                margin: '4px 0 8px'
            }}>
                <span>TOTAL Bs:</span>
                <span>{total.toFixed(2)}</span>
            </div>

            {/* Fiscal Info */}
            <div style={{ fontSize: '9px', color: '#555', marginBottom: '8px', wordBreak: 'break-all' }}>
                <div><strong>Código de Control:</strong> {controlCode}</div>
                <div><strong>Fecha Límite Emisión:</strong> 31/12/2026</div>
            </div>

            {/* Legal Footer */}
            <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '8px', lineHeight: '1.4' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO DE ACUERDO A LEY"
                </div>
                <div style={{ color: '#666', marginTop: '4px' }}>
                    Ley N° 453: El proveedor deberá entregar el producto
                    en las modalidades y términos ofertados o convenidos.
                </div>
            </div>
        </div>
    );
};

export default InvoiceTemplate;
