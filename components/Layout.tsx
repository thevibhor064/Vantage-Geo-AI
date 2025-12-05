
import React from 'react';
import { AppSection } from '../types';

interface LayoutProps {
  currentSection: AppSection;
  onNavigate: (section: AppSection) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentSection, onNavigate, children }) => {
  const navItems = [
    { id: AppSection.SEARCH, label: 'Location Finder', icon: '📍' },
    { id: AppSection.PLANNER, label: 'Travel Intelligence', icon: '🧠' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-gray-50/80 border-r border-gray-100 flex-shrink-0 flex flex-col shadow-[2px_0_20px_rgba(0,0,0,0.02)] z-20 backdrop-blur-xl">
        <div className="p-8 pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
            Vantage
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-medium tracking-wide uppercase">Geo-AI System</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                currentSection === item.id
                  ? 'bg-white shadow-lg shadow-blue-900/5 text-blue-600'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
              }`}
            >
              <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${currentSection === item.id ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="font-semibold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100/50">
                <p className="text-xs font-semibold text-blue-800 mb-1">SYSTEM STATUS</p>
                <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-sm font-bold text-slate-700">Gemini Online</span>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen relative bg-white">
        <div className="p-8 md:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
