"use client";

import { Newspaper, Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";

type NewsItem = {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
  summary: string;
  link: string;
  sentiment: string;
};

export default function NewsPage() {
  const categories = [
    { label: "Top Market News", id: "top" }, 
    { label: "My Portfolio", id: "stocks" }, 
    { label: "Global Impact", id: "global" }
  ];
  
  const [activeTab, setActiveTab] = useState(categories[0].id);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for expanded article
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    async function fetchNews() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?category=${activeTab}`);
        const data = await res.json();
        if (data.news) {
          setNewsList(data.news);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, [activeTab]);

  const handleExpand = async (news: NewsItem) => {
    if (expandedId === news.id) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(news.id);
    setFullContent(null);
    setLoadingContent(true);
    
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(news.link)}`);
      const data = await res.json();
      setFullContent(data.content);
    } catch (err) {
      setFullContent("Failed to load article content.");
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="pt-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#102a43] dark:text-white flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-[#334e68] dark:text-[#d9e2ec]" /> Market News
          </h1>
          <p className="text-[#334e68] dark:text-[#d9e2ec] mt-1">Multi-source feed with inline reading.</p>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button 
            key={cat.id} 
            onClick={() => { setActiveTab(cat.id); setExpandedId(null); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === cat.id 
              ? "bg-[#102a43] text-white dark:bg-white dark:text-[#102a43] shadow-md" 
              : "bg-white/50 dark:bg-white/5 text-[#334e68] dark:text-[#d9e2ec] hover:bg-white dark:hover:bg-white/10"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* News List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#334e68]" />
        </div>
      ) : newsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
           <Newspaper className="w-12 h-12 text-[#334e68]/30 dark:text-white/20 mb-2" />
           <h3 className="text-xl font-bold text-[#102a43] dark:text-white">No News Found</h3>
           <p className="text-[#334e68] dark:text-[#d9e2ec] max-w-md">
             {activeTab === 'stocks' 
               ? "Add stocks to your Watchlist to see personalized portfolio news."
               : "We couldn't fetch any articles for this category right now."}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {newsList.map((news) => (
            <div 
              key={news.id} 
              onClick={() => handleExpand(news)}
              className="glass-card rounded-xl p-5 hover:bg-white/80 dark:hover:bg-[#102a43]/80 transition-all cursor-pointer group block"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{news.category}</span>
                <span className="text-xs font-medium text-[#334e68] dark:text-[#d9e2ec]">{news.time}</span>
              </div>
              
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-xl font-bold text-[#102a43] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {news.title}
                </h2>
                {expandedId === news.id ? (
                   <ChevronUp className="w-6 h-6 text-[#334e68] shrink-0" />
                ) : (
                   <ChevronDown className="w-6 h-6 text-[#334e68] shrink-0 opacity-50 group-hover:opacity-100" />
                )}
              </div>
              
              {/* Summary Block */}
              {expandedId !== news.id && (
                <div className="bg-[#f0f4f8] dark:bg-[#0a192f] p-3 rounded-lg mt-3 border border-blue-500/20">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">📝 Article Brief</span>
                    <p className="text-sm text-[#334e68] dark:text-[#d9e2ec] leading-relaxed line-clamp-2">
                      {news.summary}
                    </p>
                </div>
              )}

              {/* Full Article Expansion */}
              {expandedId === news.id && (
                <div className="mt-4 pt-4 border-t border-[#102a43]/10 dark:border-white/10 cursor-text" onClick={(e) => e.stopPropagation()}>
                   {loadingContent ? (
                     <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                       <Loader2 className="w-4 h-4 animate-spin" /> Fetching full article...
                     </div>
                   ) : (
                     <div className="space-y-4">
                       <div className="prose dark:prose-invert max-w-none text-sm text-[#334e68] dark:text-[#d9e2ec] leading-relaxed whitespace-pre-wrap">
                         {fullContent}
                       </div>
                       <a href={news.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-2">
                         Read original on {news.source} <ExternalLink className="w-3 h-3" />
                       </a>
                     </div>
                   )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 mt-2">
                <span className="text-xs font-bold text-[#102a43] dark:text-white">{news.source}</span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  news.sentiment === 'Positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                  news.sentiment === 'Negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {news.sentiment} Sentiment
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
