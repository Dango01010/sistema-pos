import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-white/10 sm:px-6">
            <div className="flex justify-between flex-1 sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Siguiente
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-400">
                        Página <span className="font-medium text-white">{currentPage}</span> de <span className="font-medium text-white">{totalPages}</span>
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Anterior</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {(() => {
                            const pages = [];
                            let startPage = Math.max(1, currentPage - 2);
                            let endPage = Math.min(totalPages, currentPage + 2);
                            
                            if (currentPage <= 3) endPage = Math.min(5, totalPages);
                            if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4);
                            
                            for (let i = startPage; i <= endPage; i++) {
                                pages.push(i);
                            }
                            
                            return (
                                <>
                                    {startPage > 1 && (
                                        <>
                                            <button onClick={() => onPageChange(1)} className="relative inline-flex items-center px-4 py-2 border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 transition-colors">1</button>
                                            {startPage > 2 && <span className="relative inline-flex items-center px-4 py-2 border border-slate-700 bg-slate-800 text-sm font-medium text-slate-500">...</span>}
                                        </>
                                    )}
                                    {pages.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => onPageChange(p)}
                                            className={`relative inline-flex items-center px-4 py-2 border border-slate-700 text-sm font-medium transition-colors ${p === currentPage ? 'z-10 bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    {endPage < totalPages && (
                                        <>
                                            {endPage < totalPages - 1 && <span className="relative inline-flex items-center px-4 py-2 border border-slate-700 bg-slate-800 text-sm font-medium text-slate-500">...</span>}
                                            <button onClick={() => onPageChange(totalPages)} className="relative inline-flex items-center px-4 py-2 border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 transition-colors">{totalPages}</button>
                                        </>
                                    )}
                                </>
                            );
                        })()}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span className="sr-only">Siguiente</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
}
