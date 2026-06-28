import React from 'react';
import { Plus } from 'lucide-react';

const ProductCard = React.memo(({ product, currency, onAddToCart, getPrice, onShowDetails }) => {
    return (
        <div
            onClick={() => onShowDetails(product)}
            className="glass-card group relative flex flex-col justify-between h-full min-h-[180px] p-4 rounded-xl cursor-pointer hover:bg-accent transition-all duration-300 ease-out border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 overflow-hidden"
        >
            <div className="relative z-10 flex flex-col items-start gap-1">
                <div className="flex justify-between items-start w-full gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono bg-accent/50 px-1.5 py-0.5 rounded border border-border">
                        {product.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-sm ${product.stock > 10
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : product.stock > 0
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        {product.stock} en stock
                    </span>
                </div>

                <h3 className="font-semibold text-foreground leading-snug line-clamp-2 text-sm mb-1 group-hover:text-primary transition-colors">
                    {product.name}
                </h3>

                {product.brand && (
                    <p className="text-xs text-muted-foreground mb-3">{product.brand}</p>
                )}
            </div>

            <div className="relative z-10 pt-3 mt-auto border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Precio</span>
                    <span className="text-lg font-bold text-foreground tracking-tight">
                        <span className="text-sm font-normal text-muted-foreground mr-0.5">{currency === 'USD' ? '$' : 'Bs'}</span>
                        {getPrice(product.price)}
                    </span>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                    className="h-9 w-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95"
                    title="Agregar al carrito"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
