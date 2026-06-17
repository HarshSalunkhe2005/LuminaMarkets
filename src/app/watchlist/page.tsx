"use client";

import { BookmarkPlus, Plus, Search, Trash2, Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/utils/supabase/client";

type WatchlistDB = {
  id: string;
  symbol: string;
  name: string;
};

type WatchlistDisplay = WatchlistDB & {
  price?: string;
  change?: string;
  isPositive?: boolean;
  loadingQuote?: boolean;
};

type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial watchlist from Supabase
  useEffect(() => {
    async function loadWatchlist() {
      setLoading(true);
      const { data, error } = await supabase.from('watchlist').select('*').order('added_at', { ascending: true });
      if (!error && data) {
        const initial = data.map(item => ({ ...item, loadingQuote: true }));
        setWatchlist(initial);
        initial.forEach(fetchQuote);
      }
      setLoading(false);
    }
    loadWatchlist();
  }, []);

  // Set up auto-refresh for live prices every 15 seconds
  useEffect(() => {
    if (watchlist.length === 0) return;
    
    const intervalId = setInterval(() => {
      // Re-fetch quotes for all items silently in the background
      watchlist.forEach(item => {
        // We do not set loadingQuote to true here to avoid flickering
        fetchQuote(item);
      });
    }, 15000); // 15 seconds
    
    return () => clearInterval(intervalId);
  }, [watchlist.length]); // Re-bind if the number of items changes

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = searchQuery || "";
      if (query.trim().length > 0) {
        setIsSearching(true);
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(true);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function fetchQuote(item: WatchlistDisplay) {
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(item.symbol)}`);
      const quoteData = await res.json();
      
      setWatchlist(prev => prev.map(w => {
        if (w.id === item.id) {
          if (quoteData.error) {
            return { ...w, price: 'N/A', change: '0%', isPositive: true, loadingQuote: false };
          }
          return { 
            ...w, 
            price: quoteData.price, 
            change: quoteData.change, 
            isPositive: quoteData.isPositive,
            name: quoteData.name || w.name,
            loadingQuote: false 
          };
        }
        return w;
      }));
    } catch (err) {
      setWatchlist(prev => prev.map(w => w.id === item.id ? { ...w, loadingQuote: false } : w));
    }
  }

  async function handleAdd(symbolToSubmit: string = searchQuery, nameToSubmit: string = searchQuery) {
    const symbolStr = symbolToSubmit || "";
    if (!symbolStr.trim()) return;
    setAdding(true);
    setErrorMsg("");
    setShowDropdown(false);
    
    const cleanSymbol = symbolStr.trim().toUpperCase();
    
    // 1. Verify symbol exists first
    try {
      const verifyRes = await fetch(`/api/quote?symbol=${encodeURIComponent(cleanSymbol)}`);
      const verifyData = await verifyRes.json();
      
      if (verifyData.error) {
        setErrorMsg(`Symbol "${cleanSymbol}" not found. Please select from the dropdown.`);
        setAdding(false);
        return;
      }
      
      const officialName = verifyData.name || (nameToSubmit || cleanSymbol);

      // 2. Add to Supabase
      const { data, error } = await supabase
        .from('watchlist')
        .insert([{ symbol: cleanSymbol, name: officialName }])
        .select()
        .single();
        
      if (!error && data) {
        const newItem = { ...data, loadingQuote: true };
        setWatchlist(prev => [...prev, newItem]);
        setSearchQuery("");
        fetchQuote(newItem);
      } else if (error?.code === '23505') { // Unique constraint violation
        setErrorMsg(`"${cleanSymbol}" is already in your watchlist.`);
      } else {
        setErrorMsg("Failed to add to database.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred. Try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setWatchlist(prev => prev.filter(item => item.id !== id));
    await supabase.from('watchlist').delete().eq('id', id);
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="pt-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#102a43] dark:text-white flex items-center gap-2">
            <BookmarkPlus className="w-8 h-8 text-[#334e68] dark:text-[#d9e2ec]" /> Watchlist
          </h1>
          <p className="text-[#334e68] dark:text-[#d9e2ec] mt-1">Live market data powered by Yahoo Finance.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm font-medium border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      <div className="glass-card rounded-xl overflow-visible shadow-sm">
        <div className="p-4 border-b border-[#102a43]/10 dark:border-white/10 flex gap-2">
           <div className="relative flex-1" ref={dropdownRef}>
             <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#334e68] dark:text-[#d9e2ec] opacity-50" />
             <input 
               type="text" 
               value={searchQuery || ""}
               onChange={(e) => setSearchQuery(e.target.value)}
               onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
               onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
               placeholder="Search company or symbol..." 
               className="w-full pl-10 pr-10 py-2.5 bg-white/50 dark:bg-[#0a192f]/50 border border-[#102a43]/20 dark:border-white/20 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 text-[#102a43] dark:text-white font-medium placeholder-[#334e68]/50 dark:placeholder-[#d9e2ec]/50 uppercase"
             />
             {isSearching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 transform -translate-y-1/2 text-[#334e68]" />}
             
             {/* Autocomplete Dropdown */}
             {showDropdown && searchResults.length > 0 && (
               <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#102a43] border border-[#102a43]/10 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                 {searchResults.map((result, idx) => (
                   <div 
                     key={`${result.symbol}-${idx}`} 
                     onClick={() => {
                       setSearchQuery(result.symbol);
                       handleAdd(result.symbol, result.name);
                     }}
                     className="p-3 hover:bg-[#f0f4f8] dark:hover:bg-white/10 cursor-pointer border-b border-[#102a43]/5 dark:border-white/5 last:border-0"
                   >
                     <div className="flex justify-between items-center">
                       <span className="font-bold text-[#102a43] dark:text-white">{result.symbol}</span>
                       <span className="text-xs font-semibold px-2 py-1 bg-black/5 dark:bg-white/10 rounded text-[#334e68] dark:text-[#d9e2ec]">{result.exchange}</span>
                     </div>
                     <p className="text-sm text-[#334e68] dark:text-[#d9e2ec] truncate mt-0.5">{result.name}</p>
                   </div>
                 ))}
               </div>
             )}
           </div>
           <button 
             onClick={() => handleAdd()}
             disabled={adding || !(searchQuery || "").trim()}
             className="flex items-center gap-2 bg-[#102a43] text-white dark:bg-white dark:text-[#102a43] px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
             {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Add
           </button>
        </div>
        
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#334e68]" /></div>
        ) : watchlist.length === 0 ? (
          <div className="p-10 text-center text-[#334e68] dark:text-[#d9e2ec]">
            Your watchlist is empty. Search a company above to start tracking!
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#102a43]/10 dark:border-white/10 text-xs uppercase tracking-wider text-[#334e68] dark:text-[#d9e2ec] bg-black/5 dark:bg-white/5">
                <th className="p-4 font-bold">Symbol</th>
                <th className="p-4 font-bold text-right">Price</th>
                <th className="p-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102a43]/10 dark:divide-white/10">
              {watchlist.map((stock) => (
                <tr key={stock.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="p-4">
                    <div className="font-bold text-lg text-[#102a43] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">{stock.symbol.replace('.NS', '')}</div>
                    <div className="text-sm font-medium text-[#334e68] dark:text-[#d9e2ec] truncate max-w-[150px] sm:max-w-[300px]">{stock.name}</div>
                  </td>
                  <td className="p-4 text-right">
                    {stock.loadingQuote ? (
                      <div className="flex justify-end"><Loader2 className="w-5 h-5 animate-spin text-[#334e68]/50" /></div>
                    ) : (
                      <>
                        <div className="font-bold text-lg text-[#102a43] dark:text-white">₹{stock.price}</div>
                        <div className={`text-sm font-bold flex items-center justify-end gap-1 ${stock.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {stock.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {stock.change}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(stock.id); }}
                      className="text-red-500/50 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
