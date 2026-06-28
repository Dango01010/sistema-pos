import React from 'react';
import { Trophy, TrendingUp, Award, Star } from 'lucide-react';

function SellerLeaderboard({ sellers = [] }) {
    if (!sellers || sellers.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No data available</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                {sellers.map((seller, idx) => (
                    <div key={idx} className={`glass-card p-4 rounded-2xl relative overflow-hidden flex items-center gap-4 ${idx === 0 ? 'border-yellow-500/50 shadow-yellow-500/10' : ''}`}>
                        {idx === 0 && <div className="absolute top-0 right-0 p-1 bg-yellow-500/20 rounded-bl-xl text-yellow-500"><Trophy className="w-4 h-4" /></div>}

                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {seller.name.charAt(0)}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground text-sm truncate">{seller.name}</h4>
                            <div className="flex items-center text-xs text-yellow-500">
                                <Star className="w-3 h-3 fill-current mr-1" />
                                {seller.rating}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <p className="font-bold text-primary text-sm">Bs {seller.sales.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">{seller.deals} Ventas</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SellerLeaderboard;