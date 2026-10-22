import React, { useState } from 'react';
import {
  LayoutGrid,
  Receipt,
  ArrowLeftRight,
  Users,
  PieChart,
  TrendingUp,
  ArrowDownToLine,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { AuthUserData } from '../../services/authService';
import { NotificationBell } from '../notifications/NotificationBell';

export type DashboardTab =
  | 'overview'
  | 'transactions'
  | 'debts'
  | 'people'
  | 'budgets'
  | 'insights'
  | 'import'
  | 'settings';

interface DashboardLayoutProps {
  currentUser: AuthUserData | null;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onOpenAddExpense: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onOpenAddExpense,
  onSignOut,
  children,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: Array<{
    id: DashboardTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'debts', label: 'Debts & Dues', icon: ArrowLeftRight },
    { id: 'people', label: 'People', icon: Users },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'import', label: 'Import', icon: ArrowDownToLine },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim()) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'BB';
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col md:flex-row text-[#111827]">
      {/* Mobile Top Navigation */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#CBD5E1]">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="BucksBunny" className="w-8 h-8 object-contain" />
          <span className="font-bold text-base text-[#111827]">BucksBunny</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell onNavigateToTab={onTabChange} />
          <button
            type="button"
            onClick={onOpenAddExpense}
            className="px-2.5 py-1.5 bg-[#064E3B] text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-[#4B5563] hover:text-[#111827] rounded-lg border border-[#CBD5E1] cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-40 w-64 bg-white border-r border-[#CBD5E1] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo & Subtitle */}
          <div className="px-5 py-5 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="BucksBunny Logo"
                className="w-10 h-10 object-contain shrink-0"
              />
              <div>
                <h1 className="font-bold text-base text-[#111827] leading-tight tracking-tight">
                  BucksBunny
                </h1>
                <p className="text-xs text-[#6B7280] font-normal">Your Money Sidekick</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#E8F3EE] text-[#064E3B]'
                      : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#064E3B]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile and Sign Out Footer */}
        <div className="p-3 border-t border-[#CBD5E1] bg-white">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8FAF9] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E8F3EE] border border-[#A7F3D0] flex items-center justify-center text-xs font-bold text-[#064E3B] shrink-0">
                {getInitials(currentUser?.username, currentUser?.email)}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-bold text-[#111827] truncate">
                  {currentUser?.username || 'Personal Ledger'}
                </p>
                <p className="text-[11px] text-[#6B7280] truncate">
                  {currentUser?.email || ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-[#CBD5E1] px-6 lg:px-8 items-center justify-between sticky top-0 z-30">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-[#6B7280]">
              PERSONAL LEDGER
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <NotificationBell onNavigateToTab={onTabChange} />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
