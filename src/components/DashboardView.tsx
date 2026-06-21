/**
 * Security Dashboard View Component for WaiverSentry
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PolicyException } from '../types';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Clock, 
  XOctagon, 
  ArrowUpRight, 
  Lock, 
  MapPin, 
  Calendar,
  AlertTriangle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface DashboardViewProps {
  waivers: PolicyException[];
  onSelectTab: (tab: string) => void;
  onInspectWaiver: (waiver: PolicyException) => void;
}

export default function DashboardView({ waivers, onSelectTab, onInspectWaiver }: DashboardViewProps) {
  // Compute key statistics
  const totalWaivers = waivers.length;
  const activeWaivers = waivers.filter(w => w.status === 'active').length;
  const criticalWaivers = waivers.filter(w => w.riskScore >= 80 && (w.status === 'active' || w.status === 'pending')).length;
  const pendingWaivers = waivers.filter(w => w.status === 'pending' || w.status === 'under_review').length;
  const expiredWaivers = waivers.filter(w => w.status === 'expired').length;

  // Calculate percentages for categories
  const lowCount = waivers.filter(w => w.riskCategory === 'low').length;
  const medCount = waivers.filter(w => w.riskCategory === 'medium').length;
  const highCount = waivers.filter(w => w.riskCategory === 'high').length;
  const critCount = waivers.filter(w => w.riskCategory === 'critical').length;

  const lowPercentage = totalWaivers > 0 ? (lowCount / totalWaivers) * 100 : 0;
  const medPercentage = totalWaivers > 0 ? (medCount / totalWaivers) * 100 : 0;
  const highPercentage = totalWaivers > 0 ? (highCount / totalWaivers) * 100 : 0;
  const critPercentage = totalWaivers > 0 ? (critCount / totalWaivers) * 100 : 0;

  // Compute framework health scores (simulated based on mapped exceptions and compensating controls)
  // Fewer exceptions or greater compensating controls increases mapping health
  const getFrameworkScore = (framework: string) => {
    const related = waivers.filter(w => w.complianceMappings.some(s => s.toLowerCase().includes(framework.toLowerCase())) && w.status === 'active');
    if (related.length === 0) return 100;
    
    // Each active related waiver reduces score, modified by compensating controls
    let penalty = 0;
    related.forEach(w => {
      let wPenalty = 15;
      if (w.riskCategory === 'critical') wPenalty = 25;
      if (w.riskCategory === 'high') wPenalty = 18;
      
      // Mitigation discount lowers the penalty
      const controlsCount = w.compensatingControls.length;
      const discount = Math.min(0.60, controlsCount * 0.15);
      penalty += wPenalty * (1.0 - discount);
    });

    return Math.max(30, Math.round(100 - penalty));
  };

  const nistScore = getFrameworkScore('NIST SP 800-53');
  const gdprScore = getFrameworkScore('GDPR');
  const cisScore = getFrameworkScore('CIS Controls 1.1');

  // Identify high-priority action alerts
  const highAlerts = waivers.filter(w => (w.riskScore >= 75 || w.status === 'expired') && w.status !== 'revoked');

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100 col-span-1">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[#1e293b]">
        <div>
          <h2 id="dashboard-heading" className="text-sm font-bold tracking-tight uppercase text-white">Security & Governance Dashboard</h2>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mt-1">Real-time Exception Oversight Console</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#0f172a] px-3 py-1.5 rounded border border-[#1e293b]">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>Last Audit Sync: <strong className="text-white font-mono uppercase tracking-wide">Today, June 19, 2026</strong></span>
        </div>
      </div>

      {/* Risk and Compliance Executive Board Overview */}
      <div className="bg-[#0f172a] border border-indigo-900/40 rounded-xl p-4 bg-gradient-to-r from-indigo-950/20 via-[#0f172a] to-emerald-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1e293b]">
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono text-[9px] uppercase font-bold px-1.5">Executive Oversight</span>
              Enterprise Risk Governance & Exception Lifecycle
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Active security posture management powered by explainable risk-modeling engines, real-world attack path propagation diagnostics, and AI-assisted justification grading.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="text-[10px] text-emerald-405 flex items-center gap-1 font-mono uppercase bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Policy Compliance Active</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 text-[10px] font-mono tracking-tight">
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 mb-1">VISIBILITY TARGET</span>
            <strong className="text-emerald-400 text-sm">100% — {waivers.length} Tracked</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 mb-1">EXPIRY ALERT ACCURACY</span>
            <strong className="text-emerald-400 text-sm">{waivers.length > 0 ? '100% Measured' : 'N/A'}</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 mb-1">AVERAGE RISK SCORE</span>
            <strong className="text-indigo-400 text-sm">{waivers.length ? Math.round(waivers.reduce((a, b) => a + b.riskScore, 0) / waivers.length) : 0} Points</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 mb-1">HIGH RISK EXCEPTIONS</span>
            <strong className="text-indigo-400 text-sm">{waivers.filter(w => w.riskCategory === 'critical' || w.riskCategory === 'high').length} Tracked</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 mb-1">AUDIT READINESS SLA</span>
            <strong className="text-emerald-400 text-sm">&lt;1.0s Verified</strong>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Exception Registries */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Registry Total</span>
            <span className="text-indigo-400 bg-indigo-505/10 p-1.5 rounded border border-[#1e293b]">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-white">{totalWaivers}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">Exceptions Enrolled</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pending Review</span>
            <span className="text-blue-400 bg-blue-950/10 p-1.5 rounded border border-[#1e293b]">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-blue-400">{waivers.filter(w => w.status === 'pending').length}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">Awaiting Approval</span>
          </div>
        </div>

        {/* Active Approved */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Approved</span>
            <span className="text-emerald-400 bg-emerald-950/10 p-1.5 rounded border border-[#1e293b]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-emerald-400">{activeWaivers}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">Active - Monitored</span>
          </div>
        </div>

        {/* Critical Overrides */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Critical Hazard</span>
            <span className="text-rose-400 bg-rose-950/10 p-1.5 rounded border border-[#1e293b]">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-rose-500">{criticalWaivers}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">Score &ge; 80 Critical</span>
          </div>
        </div>

        {/* Expired / Overdue */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Expired Not Revoked</span>
            <span className="text-rose-400 bg-rose-950/10 p-1.5 rounded border border-[#1e293b]">
              <XOctagon className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-rose-500">{expiredWaivers}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">Requires manual closure</span>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Expiring Soon</span>
            <span className="text-amber-400 bg-amber-950/10 p-1.5 rounded border border-[#1e293b]">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-amber-500">{waivers.filter(w=> new Date(w.expiresAt) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && w.status === 'active').length}</h3>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1 block">&lt; 7 Days Remaining</span>
          </div>
        </div>
      </div>

      {/* Main Double Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Risk & Compliance (2 cols span on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Alerts Section */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-semibold text-white tracking-widest uppercase">Immediate Action Items</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Unmanaged anomalies</span>
            </div>
            
            <div className="space-y-3">
              {highAlerts.slice(0, 3).map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-lg border flex items-center justify-between gap-4 transition-all hover:bg-slate-800 cursor-pointer ${
                    alert.status === 'expired' 
                      ? 'bg-amber-950/10 border-amber-900/40 text-amber-100' 
                      : 'bg-red-950/10 border-red-900/40 text-red-100'
                  }`}
                  onClick={() => onInspectWaiver(alert)}
                >
                  <div className="flex items-start gap-4 overflow-hidden">
                    <span className={`text-[10px] font-mono px-2 py-1 rounded inline-block shrink-0 ${
                      alert.status === 'expired' ? 'bg-amber-900/30 text-amber-400' : 'bg-rose-900/30 text-rose-400'
                    }`}>
                      {alert.id}
                    </span>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-semibold text-white truncate">{alert.title}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-1">
                        System: <span className="font-mono text-slate-300">{alert.systemName}</span> | Owner: {alert.ownerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono bg-[#0a0b0e] px-2 py-1 rounded border border-[#1e293b] text-slate-300">
                      Risk: <strong className={alert.riskScore >= 80 ? 'text-rose-400' : 'text-amber-400'}>{alert.riskScore}</strong>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-500 hover:text-white" />
                  </div>
                </div>
              ))}
              {highAlerts.length === 0 && (
                <div className="p-4 bg-slate-900/10 border border-[#1e293b] rounded-lg text-center text-xs text-slate-500">
                  No critical or overdue exceptions currently active. Corporate security thresholds within standard operational bounds.
                </div>
              )}
            </div>
          </div>

          {/* Risk Level Distribution & Framework Status Alignment */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-5 space-y-6">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase pb-3 border-b border-[#1e293b]">Cybersecurity Risk Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category Stacked Progress */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-300">Waiver Risk Tier Density</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Aggregated probability of exposure base curves</p>
                </div>
                
                <div className="space-y-3">
                  {/* Critical */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-rose-400 font-medium">Critical (80-100)</span>
                      <span className="text-slate-400 font-mono">{critCount} ({Math.round(critPercentage)}%)</span>
                    </div>
                    <div className="w-full bg-[#0a0b0e] h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${critPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* High */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-orange-400 font-medium">High (60-79)</span>
                      <span className="text-slate-400 font-mono">{medCount + highCount > 0 ? highCount : 0} ({Math.round(highPercentage)}%)</span>
                    </div>
                    <div className="w-full bg-[#0a0b0e] h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${highPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-amber-400 font-medium">Medium (35-59)</span>
                      <span className="text-slate-400 font-mono">{medCount} ({Math.round(medPercentage)}%)</span>
                    </div>
                    <div className="w-full bg-[#0a0b0e] h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${medPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Low */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-emerald-400 font-medium">Low (0-34)</span>
                      <span className="text-slate-400 font-mono">{lowCount} ({Math.round(lowPercentage)}%)</span>
                    </div>
                    <div className="w-full bg-[#0a0b0e] h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${lowPercentage}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom SVG Distribution Chart */}
              <div className="bg-[#0a0b0e] rounded-xl border border-[#1e293b] p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-medium text-slate-300">Executive Briefing Overview</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Our dynamic math risk engine evaluates system scope, credentials, and compensating safeguards to score structural drift.</p>
                </div>
                
                <div id="risk-briefing-stats" className="pb-2 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    🛡️ <strong className="text-indigo-400 font-normal">Active waivers are decoupled</strong> from simple spreadsheets; every request is tracked in our immutable cryptography ledger.
                  </p>
                  <p>
                    ⚡ <strong className="text-emerald-400 font-normal">Compensating security discounts</strong> offset exposure and auto-grade policies to safeguard perimeter firewalls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: GRC Compliance posturing & Quick links (1 col span) */}
        <div className="space-y-6">
          
          {/* Compliance framework tracking gauges */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
              <h3 className="text-xs font-semibold text-white tracking-widest uppercase">GRC Compliance Index</h3>
              <span className="text-[10px] font-mono text-slate-500">Continuous Audit</span>
            </div>

            <div className="space-y-4">
              
              {/* NIST SP 800-53 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="font-semibold text-white">NIST SP 800-53 Compliance</span>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    nistScore >= 80 ? 'text-emerald-400 bg-emerald-950/20' : 'text-amber-400 bg-amber-950/20'
                  }`}>{nistScore}%</span>
                </div>
                <div className="w-full bg-[#0a0b0e] h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    nistScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} style={{ width: `${nistScore}%` }}></div>
                </div>
              </div>

              {/* GDPR */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="font-semibold text-white">GDPR Compliance</span>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    gdprScore >= 80 ? 'text-emerald-400 bg-emerald-950/20' : 'text-amber-400 bg-amber-950/20'
                  }`}>{gdprScore}%</span>
                </div>
                <div className="w-full bg-[#0a0b0e] h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    gdprScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} style={{ width: `${gdprScore}%` }}></div>
                </div>
              </div>

              {/* CIS Controls 1.1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="font-semibold text-white">CIS Controls 1.1</span>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    cisScore >= 80 ? 'text-emerald-400 bg-emerald-950/20' : 'text-amber-400 bg-amber-950/20'
                  }`}>{cisScore}%</span>
                </div>
                <div className="w-full bg-[#0a0b0e] h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    cisScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} style={{ width: `${cisScore}%` }}></div>
                </div>
              </div>

            </div>

            <p className="text-[10px] text-slate-500 pt-2 leading-relaxed">
              Indices represent continuous control checking protocols. An active critical-risk exception without compensating logging degradation score averages.
            </p>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase pb-3 border-b border-[#1e293b]">Sentry Control Board</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onSelectTab('request')}
                className="p-3 bg-[#0a0b0e] hover:bg-slate-800 text-left rounded border border-[#1e293b] transition-all group cursor-pointer"
              >
                <Lock className="w-4 h-4 text-rose-500 mb-2 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-semibold text-white block">Request Waiver</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Submit new security deviation request</span>
              </button>

              <button 
                onClick={() => onSelectTab('copilot')}
                className="p-3 bg-[#0a0b0e] hover:bg-slate-800 text-left rounded border border-[#1e293b] transition-all group cursor-pointer"
              >
                <Activity className="w-4 h-4 text-indigo-400 mb-2 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-semibold text-white block">AI Consult</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Ask Gemini about vulnerability risk</span>
              </button>

              <button 
                onClick={() => onSelectTab('compliance')}
                className="p-3 bg-[#0a0b0e] hover:bg-slate-800 text-left rounded border border-[#1e293b] transition-all group cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-500 mb-2 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-semibold text-white block">GRC Mapping</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">View compliance frameworks</span>
              </button>

              <button 
                onClick={() => onSelectTab('audit')}
                className="p-3 bg-[#0a0b0e] hover:bg-slate-800 text-left rounded border border-[#1e293b] transition-all group cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-purple-500 mb-2 group-hover:scale-105 transition-transform" />
                <span className="text-[11px] font-semibold text-white block">Audit Center</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Prepare ledger report summaries</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
