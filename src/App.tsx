/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  AlertCircle, 
  Globe, 
  ShieldCheck,
  ChevronRight,
  Info,
  PieChart,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingDown,
  Clock,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_STOCKS } from './data';
import { Stock, MarketType, PoliticalOutlook } from './types';
import { cn, formatCurrency, formatCompactNumber, formatPercent } from './lib/utils';
import { StockChart } from './components/StockChart';
import { getPoliticalAnalysis, fetchStockData } from './services/geminiService';

const TC_MEP = 1427.73;

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>(MOCK_STOCKS);
  const [activeMarket, setActiveMarket] = useState<MarketType>('Argentina');
  const [activeView, setActiveView] = useState<'dashboard' | 'opportunities' | 'alerts' | 'education'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [politicalContext, setPoliticalContext] = useState<PoliticalOutlook | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const marketFilteredStocks = useMemo(() => {
    return stocks.filter(stock => stock.market === activeMarket);
  }, [activeMarket, stocks]);

  // Unified logic for tools vs dashboard vs global search
  const displayStocks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // 1. GLOBAL SEARCH: If there's a search query, show all matches regardless of filters
    if (query !== '') {
      return stocks.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.ticker.toLowerCase().includes(query)
      );
    }
    
    // 2. OPPORTUNITIES VIEW: Specific logic for suggested buys
    if (activeView === 'opportunities') {
      return stocks.filter(s => s.price < s.targetPrice * 0.82);
    }
    
    // 3. ALERTS VIEW: Specific logic for assets to watch/avoid
    if (activeView === 'alerts') {
      return stocks.filter(s => s.price > s.targetPrice * 0.95 || s.ema50 < s.ema200);
    }

    // 4. DEFAULT (Dashboard): Filter by current market
    return marketFilteredStocks;
  }, [searchQuery, activeView, marketFilteredStocks, stocks]);

  const stats = useMemo(() => {
    if (marketFilteredStocks.length === 0) return { totalMCap: 0, avgProfitPot: 0, avgDividend: 0 };
    const totalMCap = marketFilteredStocks.reduce((acc, s) => acc + s.marketCap, 0);
    const avgProfitPot = marketFilteredStocks.reduce((acc, s) => acc + ((s.targetPrice / s.price) - 1), 0) / marketFilteredStocks.length;
    const avgDividend = marketFilteredStocks.reduce((acc, s) => acc + s.dividendYield, 0) / marketFilteredStocks.length;
    return { totalMCap, avgProfitPot, avgDividend };
  }, [marketFilteredStocks]);

  // Stats should reflect what's displayed
  const currentStats = useMemo(() => {
    if (displayStocks.length === 0) return { avgProfitPot: 0, avgDividend: 0 };
    const avgProfitPot = displayStocks.reduce((acc, s) => acc + (s.targetPrice / s.price - 1), 0) / displayStocks.length;
    const avgDividend = displayStocks.reduce((acc, s) => acc + s.dividendYield, 0) / displayStocks.length;
    return { avgProfitPot, avgDividend };
  }, [displayStocks]);

  const handleAnalysis = async () => {
    setIsLoadingAnalysis(true);
    setApiError(null);
    try {
      const targetStocks = (activeView === 'opportunities' || activeView === 'alerts') ? stocks : marketFilteredStocks;
      const analysis = await getPoliticalAnalysis(targetStocks, `Enfócate en explicar de forma sencilla cómo la política actual afecta a un inversor que busca estabilidad en ${activeMarket}.`);
      setPoliticalContext(analysis);
    } catch (err: any) {
      console.error(err);
      if (err.message === "QUOTA_EXCEEDED") {
        setApiError("Se ha alcanzado el límite de consultas gratuitas de AI (Quota Exceeded). Usando datos previos.");
      }
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const refreshPrices = async () => {
    setIsRefreshingPrices(true);
    setApiError(null);
    try {
      const tickers = stocks.map(s => s.ticker);
      const freshData = await fetchStockData(tickers);
      
      setStocks(prev => prev.map(stock => {
        const update = freshData.find((f: any) => f.ticker.toLowerCase() === stock.ticker.toLowerCase());
        if (update) {
          return {
            ...stock,
            price: update.price,
            targetPrice: update.targetPrice
          };
        }
        return stock;
      }));
    } catch (err: any) {
      console.error("Error updating prices:", err);
      if (err.message === "QUOTA_EXCEEDED") {
        setApiError("Límite de actualización de precios alcanzado. Mostrando últimos valores conocidos.");
      }
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  useEffect(() => {
    handleAnalysis();
    refreshPrices();
  }, [activeMarket]);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col border-r border-slate-200 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-[#cc0] rounded-sm flex items-center justify-center font-bold text-[10px] text-black">GF</div>
            <span className="font-bold tracking-tight text-xl uppercase text-[#cc0]">Guía FINET</span>
          </div>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Inversiones Inteligentes</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 mb-2 mt-4">¿Dónde Invertir?</div>
          <div 
            onClick={() => { setActiveMarket('Argentina'); setActiveView('dashboard'); }}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center gap-2 group",
              activeMarket === 'Argentina' && activeView === 'dashboard' ? "bg-[#cc0] text-black shadow-lg shadow-[#cc0]/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span>🇦🇷</span>
            Nacionales
          </div>
          <div 
            onClick={() => setActiveMarket('Global')}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center justify-between group",
              activeMarket === 'Global' ? "bg-[#cc0] text-black shadow-lg shadow-[#cc0]/20" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            Empresas Globales
            <Globe size={14} className={cn(activeMarket === 'Global' ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
          </div>

          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-3 mb-2 mt-8">Herramientas</div>
          <div 
            onClick={() => { setActiveView('opportunities'); setActiveMarket('Global'); }}
            className={cn(
              "px-3 py-2 rounded-md text-sm transition-colors cursor-pointer flex items-center gap-2",
              activeView === 'opportunities' ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            Oportunidades de Compra
          </div>
          <div 
            onClick={() => { setActiveView('alerts'); setActiveMarket('Global'); }}
            className={cn(
              "px-3 py-2 rounded-md text-sm transition-colors cursor-pointer flex items-center gap-2",
              activeView === 'alerts' ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            Alertas: Cuándo esperar
          </div>
          <div 
            onClick={() => setActiveView('education')}
            className={cn(
              "px-3 py-2 rounded-md text-sm transition-colors cursor-pointer flex items-center gap-2",
              activeView === 'education' ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            Aprender a Invertir
          </div>
          <div 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "px-3 py-2 rounded-md text-sm transition-colors cursor-pointer flex items-center gap-2 mt-4 border-t border-slate-800 pt-4",
              activeView === 'dashboard' ? "text-[#cc0]" : "text-slate-500 hover:text-white"
            )}
          >
            Volver al Dashboard
          </div>
        </nav>

        {/* AI Political Context Sidebar Panel */}
        <div className="p-4 bg-slate-800/50 m-4 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Resumen de Noticias</h4>
            {isLoadingAnalysis && <div className="w-2 h-2 rounded-full bg-[#cc0] animate-ping" />}
          </div>
          {politicalContext ? (
            <div className="space-y-3">
              <div className="text-xs">
                <span className="text-[#cc0] font-bold uppercase tracking-wider text-[10px]">Impacto Político:</span>
                <p className="text-slate-300 leading-tight mt-1 line-clamp-5 italic">"{politicalContext.summary}"</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {politicalContext.keyFactors.slice(0, 2).map(f => (
                  <span key={f} className="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-bold">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2 animate-pulse">
              <div className="h-2 bg-slate-700 rounded w-full" />
              <div className="h-2 bg-slate-700 rounded w-4/5" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {apiError && (
          <div className="bg-amber-100 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-amber-900 text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              {apiError}
            </div>
            <button onClick={() => setApiError(null)} className="text-amber-400 hover:text-amber-600 font-bold px-2 text-base">×</button>
          </div>
        )}
        {/* Header / Global Metrics */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Estrategias de Inversión FINET</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Empresas, Bonos y Actualidad Financiera
            </p>
          </div>
          <div className="flex gap-8 items-center">
            <div className="flex items-center gap-4 border-r border-slate-100 pr-6">
              <div className="text-right">
                <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Fuente: Invertir Online</p>
                <button 
                  onClick={refreshPrices}
                  disabled={isRefreshingPrices}
                  className={cn(
                    "flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide transition-all",
                    isRefreshingPrices ? "text-[#cc0] animate-pulse" : "text-slate-400 hover:text-[#cc0]"
                  )}
                >
                  <Activity size={12} className={isRefreshingPrices ? "animate-spin" : ""} />
                  {isRefreshingPrices ? 'Actualizando...' : 'Actualizar Precios'}
                </button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input 
                type="text" 
                placeholder="Buscar activo..."
                className="bg-slate-50 border border-slate-200 rounded-full py-2 pl-9 pr-4 text-xs outline-none focus:border-[#cc0] transition-colors w-40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-6 items-center text-sm border-l border-slate-100 pl-6">
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">TC MEP Referencia</p>
                <p className="text-[#cc0] font-bold text-base">${TC_MEP.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Bolsa Argentina</p>
                <p className="text-green-600 font-bold text-base">Creciendo <span className="text-[10px] ml-1 bg-green-50 px-1 rounded">+2.4%</span></p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Mercados Globales</p>
                <p className="text-green-600 font-bold text-base">Estable <span className="text-[10px] ml-1 bg-green-50 px-1 rounded">+0.8%</span></p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto space-y-8">
          
          {activeView === 'education' && !searchQuery ? (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-12 pb-20">
               <div className="text-center space-y-4 pt-10">
                 <h2 className="text-4xl font-black text-slate-800 tracking-tighter">Guía FINET para Inversores</h2>
                 <p className="text-slate-500 font-medium">Conceptos clave para entender el mercado argentino y global con claridad.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                   <div className="w-12 h-12 bg-[#cc0]/10 text-[#cc0] rounded-xl flex items-center justify-center font-bold">P/E</div>
                   <h3 className="text-xl font-bold text-slate-800 tracking-tight">Precio vs Ganancia (P/E)</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">
                     Imagina que compras un negocio de panadería. El P/E te dice cuántos años tardarías en recuperar tu inversión con las ganancias actuales. 
                     Un <strong>P/E bajo</strong> suele significar que la empresa está barata, y un <strong>P/E alto</strong> que es más cara porque el mercado espera que crezca mucho.
                   </p>
                 </div>

                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                   <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold">ROE</div>
                   <h3 className="text-xl font-bold text-slate-800 tracking-tight">Eficacia del Dinero (ROE)</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">
                     Este número te dice qué tan bueno es el equipo de la empresa para multiplicar el dinero. Si pones $100 y te devuelven $15 de ganancia al año, el ROE es 15%. 
                     Buscamos que sea <strong>mayor al 10%</strong>, indicando que el negocio es muy sano y eficiente.
                   </p>
                 </div>

                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">EMA</div>
                   <h3 className="text-xl font-bold text-slate-800 tracking-tight">El Ritmo del Mercado (EMA)</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">
                     Es un promedio de los precios de los últimos días. Nos ayuda a saber si la empresa está en "modo subida" o "modo bajada". 
                     Cuando el precio está <strong>sobre la EMA</strong>, significa que hay buen ánimo y la gente está comprando con confianza.
                   </p>
                 </div>

                 <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                   <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">DIV</div>
                   <h3 className="text-xl font-bold text-slate-800 tracking-tight">Tu Premio (Dividendos)</h3>
                   <p className="text-slate-600 text-sm leading-relaxed">
                     Algunas empresas reparten una parte de sus ganancias en efectivo a los socios (vos). Es como cobrar un alquiler por tener las acciones. 
                     Ideal para quien busca una <strong>renta fija y segura</strong> mes a mes o trimestre a trimestre.
                   </p>
                 </div>
               </div>

               <div className="bg-slate-900 text-white p-10 rounded-3xl flex items-center justify-between shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 space-y-4">
                   <h3 className="text-2xl font-black tracking-tight">¿Listo para empezar?</h3>
                   <p className="text-slate-400 text-sm max-w-lg">Vuelve al dashboard y busca las empresas que tengan el cartel verde de "Seguro y Estable". Esos son nuestros favoritos para principiantes.</p>
                   <button 
                    onClick={() => setActiveView('dashboard')}
                    className="px-6 py-3 bg-slate-900 text-[#cc0] border border-[#cc0]/30 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                   >
                     Ir al Dashboard <ArrowRight size={18} />
                   </button>
                 </div>
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                   <ShieldCheck size={160} />
                 </div>
               </div>
             </motion.div>
          ) : activeView === 'alerts' && !searchQuery ? (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
               <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-2xl space-y-4">
                 <div className="flex items-center gap-3 text-amber-800">
                    <AlertCircle size={32} />
                    <h2 className="text-2xl font-black tracking-tight">Señales de Alerta: Cuándo Tener Cautela</h2>
                 </div>
                 <p className="text-amber-900/70 font-medium">Invertir también se trata de saber cuándo NO entrar. Aquí listamos empresas que hoy están en una situación de "Espere y Vea".</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {displayStocks.map(stock => (
                   <div key={stock.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-colors">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                          {stock.market === 'Argentina' ? '🇦🇷' : stock.ticker[0]}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{stock.name}</h4>
                          <p className="text-xs text-slate-400 font-medium">{stock.price > stock.targetPrice * 0.95 ? 'Precio cerca del objetivo máximo' : 'Tendencia perdiendo fuerza'}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-sm font-black text-slate-700">
                          {stock.baseCurrency === 'USD' ? formatCurrency(stock.price * TC_MEP) : formatCurrency(stock.price)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                          USD {stock.baseCurrency === 'USD' ? stock.price.toFixed(2) : (stock.price / TC_MEP).toFixed(2)} MEP
                        </div>
                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Esperar Soporte</div>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="bg-slate-100 p-10 rounded-2xl border border-slate-200 text-center space-y-4">
                 <Info size={40} className="mx-auto text-slate-400" />
                 <h3 className="text-xl font-bold text-slate-800">¿Por qué esperar?</h3>
                 <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
                   En el mercado, a veces es mejor dejar pasar una oportunidad que entrar tarde cuando el "vía libre" ya se terminó. 
                   Una empresa excelente a un precio demasiado alto sigue siendo una inversión riesgosa.
                 </p>
               </div>
             </motion.div>
          ) : (
            <>
              {/* Dashboard Summary Cards */}
              <div className="grid grid-cols-4 gap-6">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={cn(
                  "bg-white p-5 rounded-xl border border-slate-200 shadow-sm",
                  activeView === 'opportunities' && "ring-2 ring-[#cc0] border-transparent shadow-[#cc0]/10 shadow-xl"
                )}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Buenas para Comprar <TrendingUp size={12} className="text-green-500" />
                  </p>
                  <p className="text-3xl font-black text-slate-800">
                    {searchQuery ? displayStocks.length : (
                      activeView === 'opportunities' 
                        ? stocks.filter(s => s.price < s.targetPrice * 0.82).length 
                        : marketFilteredStocks.length
                    )}
                  </p>
                  <div className="mt-3 text-[9px] text-green-700 bg-green-50 font-bold inline-block px-2 py-1 rounded uppercase tracking-wider">{searchQuery ? 'Encontrados' : 'Momento Ideal'}</div>
                </motion.div>
                
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Crecimiento Esperado <Clock size={12} className="text-[#cc0]" />
                  </p>
                  <p className="text-3xl font-black text-slate-800">+{formatPercent(currentStats.avgProfitPot * 100)}</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-3 uppercase tracking-wider">Precio Objetivo Promedio</p>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    {activeMarket === 'Argentina' ? 'Tasas de Caución AR' : 'Premios en Efectivo'} <DollarSign size={12} className="text-amber-500" />
                  </p>
                  {activeMarket === 'Argentina' ? (
                    <div className="flex items-baseline gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-green-600 uppercase">Coloc.</span>
                        <span className="text-2xl font-black text-slate-800">19.9%</span>
                      </div>
                      <div className="h-8 w-px bg-slate-100 mx-1" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-red-600 uppercase">Tomad.</span>
                        <span className="text-2xl font-black text-slate-800">21.5%</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-3xl font-black text-slate-800">{currentStats.avgDividend.toFixed(2)}%</p>
                  )}
                  <p className="text-[9px] font-bold text-slate-500 mt-3 uppercase tracking-wider">
                    {activeMarket === 'Argentina' ? 'TNA Vigente (Estimada)' : 'Dividendos promedio'}
                  </p>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Ánimo del Mercado <PieChart size={12} className="text-[#cc0]" />
                  </p>
                  <p className="text-3xl font-black text-[#cc0] uppercase tabular-nums">Bueno</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-3 uppercase tracking-wider">Contexto de Seguridad</p>
                </motion.div>
              </div>

              {/* Opportunities Table */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#cc0]" />
                    {searchQuery ? (
                      <span>Mostrando resultados globales para: <span className="text-[#cc0] underline underline-offset-4 font-black">"{searchQuery}"</span></span>
                    ) : (
                      <>{activeView === 'opportunities' ? 'Las Mejores Oportunidades FINET' : 'Activos Sugeridos (Momento de Entrada)'}</>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-[9px] rounded font-black text-slate-400 uppercase tracking-widest">
                      {searchQuery ? 'Buscando en toda la base' : `Filtro: ${activeView === 'opportunities' ? 'Máximo Descuento' : 'Seguridad Total'}`}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-black tracking-[0.15em] border-b border-slate-100">
                        <th className="px-6 py-4">Empresa</th>
                        <th className="px-4 py-4">Sector</th>
                        <th className="px-4 py-4 text-center">Precio Hoy / Objetivo</th>
                        <th className="px-4 py-4">Ganancia Posible</th>
                        <th className="px-2 py-4">Salud Financiera</th>
                        <th className="px-2 py-4">Premio (Dividendos)</th>
                        <th className="px-4 py-4 text-right pr-8 whitespace-nowrap">Estado Tendencia</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm border-t border-slate-100/50">
                      <AnimatePresence mode="popLayout">
                        {displayStocks
                          .map((stock, idx) => (
                          <motion.tr 
                            key={stock.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedStock(stock)}
                            className="border-b border-slate-50 hover:bg-[#cc0]/5 transition-all cursor-pointer group"
                          >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded text-slate-600 flex items-center justify-center font-bold text-xs uppercase group-hover:bg-[#cc0]/10 group-hover:text-[#cc0] transition-colors">
                              {stock.market === 'Argentina' ? (stock.assetType === 'Acción' ? '🇦🇷' : '🏛️') : stock.ticker[0]}
                            </div>
                            <div>
                               <span className="font-extrabold text-slate-800 text-sm tracking-tight">{stock.ticker}</span>
                               <span className="font-medium text-slate-400 block text-[10px] uppercase tracking-wide truncate max-w-[140px]">{stock.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className="px-2 py-1 bg-slate-100 text-[9px] font-black text-slate-500 uppercase rounded tracking-wider whitespace-nowrap">
                            {stock.industry}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="font-black text-slate-800">
                            {stock.baseCurrency === 'USD' 
                              ? formatCurrency(stock.price * TC_MEP) 
                              : formatCurrency(stock.price)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium tracking-tight">
                            USD {stock.baseCurrency === 'USD' 
                              ? stock.price.toFixed(2) 
                              : (stock.price / TC_MEP).toFixed(2)} MEP
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <div className="font-black text-green-600 flex items-center gap-1">
                            <TrendingUp size={14} />
                            +{((stock.targetPrice / stock.price - 1) * 100).toFixed(0)}%
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">Obj: {stock.baseCurrency === 'USD' ? (stock.targetPrice * TC_MEP).toLocaleString() : stock.targetPrice.toLocaleString()}</div>
                        </td>
                        <td className="px-2 py-5 font-bold text-slate-700">
                          <div className="flex items-center gap-1">
                             <CheckCircle2 size={12} className="text-green-500" />
                             {stock.assetType === 'Acción' ? 'Eficaz' : 'Sólido'}
                          </div>
                        </td>
                            <td className="px-2 py-5 font-bold text-slate-700">
                              {stock.dividendYield > 0 ? `${stock.dividendYield}%` : 'Reinversión'}
                            </td>
                            <td className="px-4 py-5 text-right pr-6">
                           <span className={cn(
                             "px-2.5 py-1 text-[9px] rounded-full font-black uppercase tracking-wider whitespace-nowrap",
                             stock.price < stock.targetPrice * 0.8 ? "bg-green-100 text-green-700" : "bg-[#cc0]/10 text-[#cc0] border border-[#cc0]/20"
                           )}>
                             {stock.assetType !== 'Acción' ? `${stock.assetType} - ${stock.price < stock.targetPrice * 0.8 ? 'Creciendo' : 'Estable'}` : (stock.price < stock.targetPrice * 0.8 ? 'Creciendo con Fuerza' : 'Estable y Seguro')}
                           </span>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {displayStocks.length === 0 && (
                    <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                      Aún no encontramos resultados que coincidan
                    </div>
                  )}
                </div>
              </section>

              {/* Warning & Insights Panel */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-5 items-start">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                    <AlertCircle size={24} className="text-amber-800" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-amber-900 text-sm uppercase tracking-wide">Consejo de tu Asesor</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      {activeMarket === 'Argentina' 
                        ? "Los cambios en el país generan movimientos bruscos. Recomendamos solo empresas argentinas que tengan negocios grandes y probados por años."
                        : "No te dejes llevar por las modas. Enfócate en las empresas que ya ganan mucho dinero y tienen poca deuda. La paciencia siempre paga."}
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col justify-between shadow-xl">
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avisos Importantes</h4>
                    <span className="text-[8px] bg-red-500 font-black px-2 py-0.5 rounded tracking-tighter shrink-0">ACTUALIZADO</span>
                  </div>
                  <div className="space-y-3">
                    <div className="text-[11px] bg-slate-800/80 p-2.5 rounded border-l-2 border-slate-500">
                      <p className="text-slate-400 font-black uppercase text-[9px] mb-1">NVIDIA</p>
                      <p className="text-slate-200 font-medium leading-tight">Los dueños vendieron algunas acciones. Nada grave, pero a monitorear.</p>
                    </div>
                    <div className="text-[11px] bg-slate-800/80 p-2.5 rounded border-l-2 border-[#cc0]">
                      <p className="text-[#cc0] font-black uppercase text-[9px] mb-1 flex items-center gap-1">Empresas 🇦🇷</p>
                      <p className="text-slate-200 font-medium leading-tight">Mejor expectativa por el canje de deuda nacional y nuevos bonos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Detail Overlay (Simple Version) */}
      <AnimatePresence>
        {selectedStock && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 lg:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStock(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl h-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Overlay Content */}
              <div className="overflow-y-auto flex-1">
                <div className="p-10 space-y-12">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-[#cc0]/10 text-[#cc0] border border-[#cc0]/20 rounded">
                          Bolsa de {selectedStock.market}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedStock.industry}</span>
                      </div>
                      <h2 className="text-5xl font-black text-slate-800 tracking-tighter flex items-center gap-4">
                        {selectedStock.ticker}
                        <span className="text-xl font-bold text-slate-300 tracking-normal">{selectedStock.name}</span>
                      </h2>
                    </div>
                    <button 
                      onClick={() => setSelectedStock(null)}
                      className="p-4 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all border border-transparent hover:border-slate-100"
                    >
                      <XCircle size={32} strokeWidth={1.5} />
                    </button>
                  </div>

                  {/* Analysis Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">¿Qué hace esta empresa?</h3>
                        <p className="text-slate-600 text-lg leading-relaxed font-medium">
                          {selectedStock.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col justify-center">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Precio Actual (ARS)</div>
                          <div className="text-2xl font-black text-slate-800 tabular-nums">
                            {selectedStock.baseCurrency === 'USD' ? formatCurrency(selectedStock.price * TC_MEP) : formatCurrency(selectedStock.price)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium mt-1">
                            Equivale a <span className="font-bold text-slate-700">USD {selectedStock.baseCurrency === 'USD' ? selectedStock.price.toFixed(2) : (selectedStock.price / TC_MEP).toFixed(2)}</span> Dólar MEP
                          </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Tamaño (Valor Total)</div>
                          <div className="text-2xl font-black text-slate-800 tabular-nums">${selectedStock.marketCap} Billones</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Precio vs Ganancia</div>
                          <div className="text-2xl font-black text-slate-800 tabular-nums">{selectedStock.peRatio} veces</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Calidad del Negocio</div>
                          <div className="text-2xl font-black text-slate-800 tabular-nums">{selectedStock.roe}%</div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                          <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Salud Financiera</div>
                          <div className="text-2xl font-black text-slate-800 tabular-nums">Muy Sólida</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-8 text-white space-y-8 shadow-2xl shadow-slate-900/40">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-400">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                         Chequeo de Seguridad para tu Capital
                      </h3>
                      <div className="space-y-6">
                        {[
                          { label: 'Es una empresa Gigante y Estable', passed: selectedStock.marketCap >= 10 },
                          { label: 'El precio es una Oportunidad Real', passed: selectedStock.price < selectedStock.targetPrice },
                          { label: 'Gana buen dinero por cada inversión', passed: selectedStock.roe > 10 },
                          { label: 'Está en momento de Recuperación', passed: selectedStock.ema50 > selectedStock.ema200 }
                        ].map(check => (
                          <div key={check.label} className="flex items-center justify-between group">
                            <span className="text-sm font-medium text-slate-400 group-hover:text-white transition-colors">{check.label}</span>
                            <div className={cn(
                              "w-5 h-5 rounded flex items-center justify-center transition-all",
                              check.passed ? "bg-green-500 shadow-lg shadow-green-500/20" : "bg-slate-800"
                            )}>
                              {check.passed && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-8 border-t border-white/5">
                         <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-4">Puntaje del Asesor Financiero</div>
                         <div className="flex items-center gap-6">
                           <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, (selectedStock.targetPrice / selectedStock.price) * 40)}%` }}
                               className="h-full bg-[#cc0] rounded-full shadow-[0_0_15px_rgba(204,204,0,0.4)]" 
                             />
                           </div>
                           <span className="text-4xl font-black text-white italic tracking-tighter">Excelente</span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart for beginners */}
                  <div className="space-y-6 border-t border-slate-100 pt-12">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">¿Hacia dónde va el precio? (Últimos 30 días)</h3>
                      <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                         <span className="flex items-center gap-2"><div className="w-3 h-1 rounded-full bg-[#cc0]" /> Fuerza de Corto Plazo</span>
                         <span className="flex items-center gap-2"><div className="w-3 h-1 rounded-full bg-red-400" /> Promedio a Largo Plazo</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <StockChart stock={selectedStock} />
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-[#cc0]/5 rounded-xl border border-[#cc0]/20">
                      <Info size={24} className="text-[#cc0] shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed font-bold italic uppercase tracking-wide">
                        Veredicto: La empresa está con <strong>{selectedStock.ema50 > selectedStock.ema200 ? 'FUERZA POSITIVA' : 'CALMA'}</strong>. 
                        El precio hoy es ideal porque está {selectedStock.price < selectedStock.targetPrice * 0.9 ? 'MUY BARATO' : 'A UN PRECIO JUSTO'} comparado con su valor real. 
                        Es un buen momento para {selectedStock.price < selectedStock.targetPrice * 0.8 ? 'COMPRAR' : 'VIGILAR ACERCA'}.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end px-10 shrink-0">
                <button 
                  onClick={() => setSelectedStock(null)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  Regresar al Panel Principal <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
