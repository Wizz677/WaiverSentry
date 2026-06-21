/**
 * Sidebar Navigation Component for WaiverSentry
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  FolderLock, 
  FilePlus2, 
  Layers, 
  Calculator, 
  BrainCircuit, 
  FileSpreadsheet, 
  Presentation, 
  CircleDot,
  UserCheck,
  ShieldAlert,
  Hourglass,
  Users,
  Activity,
  Target
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  criticalCount: number;
}

export default function Sidebar({ activeTab, setActiveTab, pendingCount, criticalCount }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Security Dashboard', icon: LayoutDashboard },
    { id: 'official-output', label: 'Official Export Engine', icon: LayoutDashboard, badge: 'Required', badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    { id: 'registry', label: 'Policy Exception Registry', icon: FolderLock, badge: criticalCount > 0 ? `${criticalCount} High Risk` : undefined, badgeColor: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
    { id: 'request', label: 'Submit Waiver Request', icon: FilePlus2 },
    { id: 'alerts', label: 'Email Alerts System', icon: Layers, badge: 'Automated', badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'criteria', label: 'Success Criteria', icon: Target },
  ];

  return (
    <aside id="sidebar-nav" className="w-64 bg-[#0a0b0e] border-r border-[#1e293b] flex flex-col h-screen shrink-0 text-slate-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e293b] flex items-center justify-between bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded flex items-center justify-center font-bold text-white w-8 h-8">
            V
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight uppercase text-white leading-none">Waiver<span className="text-indigo-400">Sentry</span></h1>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-1 block">Exception Engine v2.4.0</span>
          </div>
        </div>
      </div>

      {/* active system state */}
      <div className="mx-4 my-4 p-3 rounded bg-[#0f172a] border border-[#1e293b] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CircleDot className="w-2.5 h-2.5 text-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide truncate">SYSTEM STATUS: OPTIMAL</span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">v1.2</span>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-btn-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-semibold' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${item.badgeColor || 'bg-[#0f172a] border border-[#1e293b] text-slate-400'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operator context */}
      <div className="p-4 border-t border-[#1e293b] bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-white border border-slate-700">
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs font-medium text-slate-200 block truncate">SecOps Lead Auditor</span>
            <span className="text-[9px] font-mono text-slate-500 truncate block">abdullah2003shoaib@gmail.com</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
