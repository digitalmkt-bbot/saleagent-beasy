import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  LineChart, 
  Receipt, 
  CreditCard, 
  Info, 
  HelpCircle, 
  FileText, 
  Gift, 
  Settings, 
  Search, 
  Bell, 
  Mail, 
  Calendar, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sun, 
  Moon, 
  User, 
  TrendingUp, 
  CheckCircle2,
  DollarSign
} from 'lucide-react';

const MARKET_SUMMARY = [
  {
    id: 'sp500',
    title: 'S&P 500',
    iconLetter: 'S',
    iconBg: 'bg-amber-400 text-white',
    timeframe: 'Last 30 days',
    value: '$9.562,31',
    change: '+21%',
    isPositive: true,
    lastPeriod: 'vs 8.734,00 Last Period',
    gradientId: 'greenGrad1',
    lineColor: '#10B981',
    fillColor: '#10B981',
    path: 'M 0 35 Q 25 30 40 18 T 80 25 T 120 10 T 160 5 T 200 8',
    endPoint: { x: 200, y: 8 }
  },
  {
    id: 'dow',
    title: 'Dow Jones',
    iconLetter: 'D',
    iconBg: 'bg-blue-500 text-white',
    timeframe: 'Last 30 days',
    value: '$6.229,00',
    change: '+18%',
    isPositive: true,
    lastPeriod: 'vs 5.871,00 Last Period',
    gradientId: 'blueGrad1',
    lineColor: '#10B981',
    fillColor: '#10B981',
    path: 'M 0 28 Q 30 20 60 25 T 110 18 T 160 12 T 200 6',
    endPoint: { x: 200, y: 6 }
  },
  {
    id: 'nasdaq',
    title: 'NASDAQ',
    iconLetter: 'N',
    iconBg: 'bg-yellow-500 text-white',
    timeframe: 'Last 30 days',
    value: '$3.670,09',
    change: '-14%',
    isPositive: false,
    lastPeriod: 'vs 5.430,51 Last Period',
    gradientId: 'redGrad1',
    lineColor: '#EF4444',
    fillColor: '#EF4444',
    path: 'M 0 10 Q 30 5 60 18 T 110 12 T 160 28 T 200 22',
    endPoint: { x: 200, y: 22 }
  }
];

const PORTFOLIO_MONTHS = [
  { month: 'May', topHeight: 70, bottomHeight: 25 },
  { month: 'Jun', topHeight: 35, bottomHeight: 30 },
  { month: 'Jul', topHeight: 50, bottomHeight: 40 },
  { month: 'Aug', topHeight: 45, bottomHeight: 20 },
  { month: 'Sep', topHeight: 65, bottomHeight: 32 },
  { month: 'Nov', topHeight: 58, bottomHeight: 28 },
  { month: 'Des', topHeight: 40, bottomHeight: 35 }
];

const DATA_FUNDAMENTAL = [
  {
    id: 'pe',
    indicator: 'P/E',
    subtext: 'Price to',
    price: '$124.09',
    change: '1.25',
    percentage: '18%',
    isPositive: true,
    currentValue: '$2056.18'
  },
  {
    id: 'eps',
    indicator: 'EPS',
    subtext: 'Earnings',
    price: '$118.21',
    change: '1.17',
    percentage: '14%',
    isPositive: true,
    currentValue: '$1827.36'
  },
  {
    id: 'dvd',
    indicator: 'DVD',
    subtext: 'Dividend',
    price: '$112.59',
    change: '0.14',
    percentage: '12%',
    isPositive: true,
    currentValue: '$1653.41'
  },
  {
    id: 'roa',
    indicator: 'ROA',
    subtext: 'Return on',
    price: '$109.48',
    change: '0.8',
    percentage: '8%',
    isPositive: false,
    currentValue: '$1034.21'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState('S&P 500');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredFundamentals = DATA_FUNDAMENTAL.filter(item =>
    item.indicator.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtext.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans flex ${isDarkMode ? 'bg-[#0F172A] text-slate-100' : 'bg-[#F3F4F6] text-slate-800'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {}
      <aside className={`w-64 shrink-0 flex flex-col justify-between p-5 border-r transition-colors duration-300 ${isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                <path d="M12 2 A 10 10 0 0 1 22 12 L 12 12 Z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">InvestIQ</span>
          </div>

          {/* General Section */}
          <div className="mb-6">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">General</p>
            <nav className="space-y-1">
              {[
                { name: 'Dashboard', icon: LayoutDashboard },
                { name: 'Analysis', icon: LineChart },
                { name: 'Transaction', icon: Receipt },
                { name: 'Card', icon: CreditCard }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.name);
                      showToast(`Switched to ${item.name}`);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-[#00D084] text-white shadow-md shadow-emerald-500/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Support Section */}
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Support</p>
            <nav className="space-y-1">
              {[
                { name: 'About', icon: Info },
                { name: 'FAQ', icon: HelpCircle },
                { name: 'Repots', icon: FileText },
                { name: 'Gift', icon: Gift }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => showToast(`Opened ${item.name}`)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom Utilities */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <button onClick={() => showToast('Settings Modal')} className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button onClick={() => showToast('Help Center')} className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
            <HelpCircle className="w-4 h-4" />
            <span>Help</span>
          </button>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center justify-between px-3.5 py-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme Mode</span>
            <button 
              onClick={() => {
                setIsDarkMode(!isDarkMode);
                showToast(`Switched to ${!isDarkMode ? 'Dark' : 'Light'} Mode`);
              }} 
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${isDarkMode ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'}`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center text-[10px]">
                {isDarkMode ? <Moon className="w-2.5 h-2.5 text-slate-800" /> : <Sun className="w-2.5 h-2.5 text-amber-500" />}
              </div>
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mt-4 pt-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 transition">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120" 
                alt="Makai Pugh" 
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Makai Pugh</p>
                <p className="text-[10px] text-slate-400 truncate">makaipugh@gmail.com</p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>
      </aside>

      {}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search" 
                className={`text-xs pl-10 pr-4 py-2.5 rounded-2xl w-56 border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${
                  isDarkMode 
                    ? 'bg-[#1E293B] border-slate-700 text-white placeholder-slate-500' 
                    : 'bg-white border-slate-200/80 text-slate-800 placeholder-slate-400 shadow-xs'
                }`}
              />
            </div>

            {/* Notifications & Mail Buttons */}
            <button 
              onClick={() => showToast('No new notifications')}
              className={`p-2.5 rounded-2xl border transition ${isDarkMode ? 'bg-[#1E293B] border-slate-700 text-slate-300' : 'bg-white border-slate-200/80 text-slate-600 shadow-xs hover:bg-slate-50'}`}
            >
              <Bell className="w-4 h-4" />
            </button>

            <button 
              onClick={() => showToast('Messages inbox empty')}
              className={`p-2.5 rounded-2xl border transition ${isDarkMode ? 'bg-[#1E293B] border-slate-700 text-slate-300' : 'bg-white border-slate-200/80 text-slate-600 shadow-xs hover:bg-slate-50'}`}
            >
              <Mail className="w-4 h-4" />
            </button>

            {/* Date Picker Button */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-medium cursor-pointer transition ${
              isDarkMode ? 'bg-[#1E293B] border-slate-700 text-slate-300' : 'bg-white border-slate-200/80 text-slate-700 shadow-xs hover:bg-slate-50'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>18 December 2024 - 18 January 2025</span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-400 font-normal">Last 30 Days</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </div>
          </div>
        </header>

        {}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MARKET_SUMMARY.map((card) => (
            <div 
              key={card.id} 
              className={`p-5 rounded-3xl border transition-all duration-300 hover:shadow-lg ${
                isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${card.iconBg}`}>
                    {card.iconLetter}
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{card.title}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{card.timeframe}</span>
              </div>

              {/* Sparkline Visual */}
              <div className="h-16 w-full my-2 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 40">
                  <defs>
                    <linearGradient id={card.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={card.fillColor} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={card.fillColor} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area Fill */}
                  <path 
                    d={`${card.path} L 200 40 L 0 40 Z`} 
                    fill={`url(#${card.gradientId})`} 
                  />

                  {/* Stroke Line */}
                  <path 
                    d={card.path} 
                    fill="none" 
                    stroke={card.lineColor} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />

                  {/* End Dot */}
                  <circle cx={card.endPoint.x} cy={card.endPoint.y} r="3.5" fill={card.lineColor} />
                  <circle cx={card.endPoint.x} cy={card.endPoint.y} r="6" fill={card.lineColor} fillOpacity="0.3" />
                </svg>
              </div>

              {/* Value and Percentage */}
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</span>
                
                <div className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                  card.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                }`}>
                  {card.isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  <span>{card.change}</span>
                </div>
              </div>

              {/* Subtext Comparison */}
              <p className="text-[11px] font-medium text-slate-400 mt-1">{card.lastPeriod}</p>
            </div>
          ))}
        </section>

        {}
        <section className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-100 shadow-xs'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Column: Portfolio Dual Bar Chart (Span 8) */}
            <div className="lg:col-span-8">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-6">Portfolio</h2>

              {/* Custom Dual Bar Chart */}
              <div className="relative">
                {/* Y-Axis Guidelines */}
                <div className="flex flex-col justify-between h-48 text-[10px] font-semibold text-slate-400 mb-6">
                  <div className="flex items-center gap-2">
                    <span>$5k</span>
                    <div className="flex-1 border-b border-dashed border-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>$0k</span>
                    <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>$3k</span>
                    <div className="flex-1 border-b border-dashed border-slate-100 dark:border-slate-800" />
                  </div>
                </div>

                {/* Bars Container */}
                <div className="absolute inset-x-10 top-0 bottom-6 flex items-center justify-between px-4">
                  {PORTFOLIO_MONTHS.map((item) => (
                    <div key={item.month} className="flex flex-col items-center group cursor-pointer">
                      
                      {/* Top Green Bar (Positive) */}
                      <div className="w-3.5 bg-gradient-to-t from-emerald-500 to-[#00D084] rounded-t-full transition-all group-hover:brightness-110" style={{ height: `${item.topHeight}px` }} />
                      
                      {/* Gap Spacer at $0k baseline */}
                      <div className="h-1 bg-transparent" />
                      
                      {/* Bottom Teal Bar (Negative) */}
                      <div className="w-3.5 bg-slate-800 dark:bg-slate-600 rounded-b-full transition-all group-hover:brightness-125" style={{ height: `${item.bottomHeight}px` }} />

                      {/* Month Label */}
                      <span className="absolute bottom-0 translate-y-6 text-xs font-bold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: S&P Breakdown Card (Span 4) */}
            <div className="lg:col-span-4 bg-slate-50/80 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              
              {/* Card Selector Header */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold text-[10px]">
                    S
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedPortfolioIndex}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Income Metric Box */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block">Income</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">$15.891,04</span>
                  </div>
                </div>

                <div className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  <span>21%</span>
                </div>
              </div>

              {/* Expense Metric Box */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block">Expense</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">$7.509,61</span>
                  </div>
                </div>

                <div className="flex items-center text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  <span>14%</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Stock Performance Chart Box (Span 6) */}
          <div className={`lg:col-span-6 p-6 rounded-3xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Stock Performance</h2>

            <div className="relative h-56 w-full pt-4">
              {/* Y-Axis Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between text-[10px] font-semibold text-slate-400 pointer-events-none">
                <div className="border-b border-dashed border-slate-100 dark:border-slate-800 pb-1">500k</div>
                <div className="border-b border-dashed border-slate-100 dark:border-slate-800 pb-1">100k</div>
                <div className="border-b border-dashed border-slate-100 dark:border-slate-800 pb-1">50k</div>
                <div>0</div>
              </div>

              {/* Interactive Peak Tooltip Pill */}
              <div className="absolute top-[28%] left-[54%] -translate-x-1/2 z-10 bg-white dark:bg-slate-800 text-emerald-600 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1">
                <span>$300</span>
              </div>

              {/* Dashed Guideline to Peak */}
              <div className="absolute top-[42%] left-[54%] bottom-6 border-l border-dashed border-slate-300 dark:border-slate-600 pointer-events-none" />

              {/* SVG Curve Splines */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                
                {/* Dark Navy Secondary Curve */}
                <path 
                  d="M 10 90 Q 50 60 90 85 T 180 80 T 270 100" 
                  fill="none" 
                  stroke={isDarkMode ? '#64748B' : '#1E293B'} 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                />

                {/* Primary Green Curve */}
                <path 
                  d="M 10 75 Q 40 60 80 80 T 160 30 T 270 95" 
                  fill="none" 
                  stroke="#10B981" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                />

                {/* Highlight Point on April Peak */}
                <circle cx="162" cy="30" r="4" fill="#10B981" />
                <circle cx="162" cy="30" r="7" fill="#10B981" fillOpacity="0.25" />
              </svg>

              {/* X-Axis Months */}
              <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-1 px-2">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
              </div>
            </div>
          </div>

          {/* Data Fundamental List Table Box (Span 6) */}
          <div className={`lg:col-span-6 p-6 rounded-3xl border flex flex-col justify-between ${
            isDarkMode ? 'bg-[#1E293B] border-slate-800' : 'bg-white border-slate-100 shadow-xs'
          }`}>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Data fundamental</h2>

            {/* Fundamentals Table */}
            <div className="space-y-3">
              {filteredFundamentals.map((row) => (
                <div 
                  key={row.id} 
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition duration-150"
                >
                  {/* Indicator & Subtext */}
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">{row.indicator}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{row.subtext}</p>
                  </div>

                  {/* Price */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Price</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{row.price}</span>
                  </div>

                  {/* Change */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block">Change</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{row.change}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center ${
                        row.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                      }`}>
                        {row.isPositive ? '↗' : '↘'} {row.percentage}
                      </span>
                    </div>
                  </div>

                  {/* Current Value */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium block">Current Value</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">{row.currentValue}</span>
                  </div>

                </div>
              ))}
            </div>
          </div>

        </section>

      </main>

    </div>
  );
}