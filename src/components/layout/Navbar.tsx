"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineChart, Newspaper, BookmarkPlus, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "News", href: "/news", icon: Newspaper },
    { name: "Watchlist", href: "/watchlist", icon: BookmarkPlus },
    { name: "Predictions", href: "/predictions", icon: LineChart },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 glass-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#334e68] to-[#102a43] flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                <LineChart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#102a43] dark:text-white">
                LuminaMarkets
              </span>
            </Link>
          </div>
          
          {/* Desktop Nav Links */}
          <div className="hidden sm:block">
            <div className="ml-10 flex items-baseline space-x-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out ${
                      isActive
                        ? "bg-[#f0f4f8] text-[#102a43] dark:bg-[#102a43] dark:text-white shadow-sm"
                        : "text-[#334e68] hover:bg-[#f0f4f8] hover:text-[#102a43] dark:text-[#d9e2ec] dark:hover:bg-[#334e68] dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav Links - Bottom Bar style for small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 w-full glass-card border-t border-white/10 p-2 z-50">
        <div className="flex justify-around items-center">
          {navLinks.map((link) => {
             const isActive = pathname === link.href;
             const Icon = link.icon;
             
             return (
               <Link
                 key={link.name}
                 href={link.href}
                 className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] transition-colors ${
                   isActive 
                     ? "text-[#102a43] dark:text-white font-semibold" 
                     : "text-[#334e68] dark:text-[#d9e2ec] hover:bg-black/5 dark:hover:bg-white/5"
                 }`}
               >
                 <Icon className={`w-6 h-6 mb-1 ${isActive ? "scale-110 transition-transform" : ""}`} />
                 <span className="text-[10px] leading-tight">{link.name}</span>
               </Link>
             );
          })}
        </div>
      </div>
    </nav>
  );
}
