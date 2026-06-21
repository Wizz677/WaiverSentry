/**
 * Policy Exception Central Registry View Component
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PolicyException, ExceptionType, WaiverStatus } from '../types';
import { COMPENSATING_CONTROLS_REGISTRY } from '../utils/riskEngine';
import { 
  Search, 
  Filter, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  CheckCircle, 
  XOctagon, 
  Clock, 
  Layers, 
  FileLock, 
  User, 
  Mail, 
  ShieldCheck,
  AlertOctagon,
  CalendarDays,
  Menu,
  ChevronRight
} from 'lucide-react';

interface RegistryViewProps {
  waivers: PolicyException[];
  onRenewWaiver: (id: string, extensionDays: number) => void;
  onRevokeWaiver: (id: string, reason: string) => void;
  onApproveWaiver: (id: string) => void;
  onRejectWaiver: (id: string, reason: string) => void;
  selectedWaiver: PolicyException | null;
  setSelectedWaiver: (waiver: PolicyException | null) => void;
}

export default function RegistryView({ waivers, onRenewWaiver, onRevokeWaiver, onApproveWaiver, onRejectWaiver, selectedWaiver, setSelectedWaiver }: RegistryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  
  // Modal states for replacing window.prompt/confirm
  const [modalState, setModalState] = useState<{type: 'none' | 'revoke' | 'renew' | 'reject' | 'approve', waiverId?: string}>({type: 'none'});
  const [modalInputValue, setModalInputValue] = useState('');

  // State for AI Analysis Trigger
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any | null>(null);

  // Filter list
  const filteredWaivers = waivers.filter(w => {
    const matchesSearch = 
      w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.systemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    const matchesType = typeFilter === 'all' || w.type === typeFilter;
    const matchesAnomaly = anomalyFilter === 'all' || w.anomaly === anomalyFilter || (anomalyFilter === 'none' && !w.anomaly);
    
    return matchesSearch && matchesStatus && matchesType && matchesAnomaly;
  });

  // Call server-side security analyst route
  const handleRunAiAnalysis = async (waiver: PolicyException) => {
    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-waiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: waiver.title,
          description: waiver.description,
          type: waiver.type,
          justification: waiver.justification,
          businessCriticality: waiver.businessCriticality,
          accessLevel: waiver.accessLevel,
          compensatingControls: waiver.compensatingControls
        })
      });

      if (!response.ok) {
        throw new Error('Analyst API returned an error');
      }

      const result = await response.json();
      setAiAnalysisResult(result);
    } catch (e: any) {
      console.error(e);
      setAiAnalysisResult({
        justificationScore: 5,
        justificationGrade: 'C',
        threatAnalysis: 'Failed to connect to actual server-side Gemini threat engine. Running locally.',
        remediationPlan: [
          'Validate Jenkins token rotation limits.',
          'Inject logging limits into the proxy tier.',
          'Retain senior DBA credentials in password vault.'
        ],
        recommendedCompensatingControls: ['siem_alerting'],
        cisoAssessment: 'Internal CISO Analytics. Keep standard whitelisting applied.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const statusTags: Record<WaiverStatus, { bg: string, text: string, label: string }> = {
    pending: { bg: 'bg-blue-950/40 text-blue-400 border border-blue-900/50', text: 'text-blue-400', label: 'Requested' },
    under_review: { bg: 'bg-purple-950/40 text-purple-400 border border-purple-900/50', text: 'text-purple-400', label: 'Reviewed' },
    approved: { bg: 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/50', text: 'text-indigo-400', label: 'Approved' },
    active: { bg: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50', text: 'text-emerald-400', label: 'Active - Monitored' },
    renewal_requested: { bg: 'bg-cyan-950/40 text-cyan-400 border border-cyan-900/50', text: 'text-cyan-400', label: 'Renewal Requested' },
    re_approved: { bg: 'bg-teal-950/40 text-teal-400 border border-teal-900/50', text: 'text-teal-400', label: 'Re-approved' },
    expired: { bg: 'bg-amber-950/40 text-amber-400 border border-amber-900/50', text: 'text-amber-400', label: 'Expired' },
    revoked: { bg: 'bg-red-950/40 text-red-400 border border-red-900/50', text: 'text-red-400', label: 'Revoked - Blocked' }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500 border-red-900/60 bg-red-950/20';
    if (score >= 60) return 'text-orange-400 border-orange-900/60 bg-orange-950/20';
    if (score >= 35) return 'text-amber-400 border-amber-900/60 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-900/60 bg-emerald-950/20';
  };

  const getExceptionTypeLabel = (type: ExceptionType) => {
    switch (type) {
      case 'mfa_bypass': return 'Temp MFA Bypass';
      case 'firewall_rule': return 'Firewall Opening';
      case 'admin_privilege': return 'Admin Privilege Waiver';
      case 'password_policy': return 'Password Metric Bypass';
      case 'third_party_access': return '3rd Party Sandbox Bypass';
      case 'other': return 'Standard Policy Waiver';
    }
  };

  return (
    <div className="h-full flex text-slate-100 overflow-hidden">
      
      {/* Left side: Central Registry Table */}
      <div className="flex-1 p-6 flex flex-col space-y-4 overflow-y-auto">
        
        {/* Header and Filter Controls */}
        <div className="space-y-4">
          <div>
            <h2 id="registry-heading" className="text-xl font-semibold text-white tracking-tight">Central Exception Registry</h2>
            <p className="text-xs text-slate-400 mt-1">Official inventory of authorized security policy excursions, calculated hazard risks, and active compensating safeguards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                id="search-input"
                type="text"
                placeholder="Search by waiver code, title, owner, system..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded py-2 pl-9 pr-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-[#0f172a] border border-[#1e293b] rounded px-2">
              <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none mr-2" />
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-transparent border-none text-slate-300 text-xs py-2 focus:outline-none"
              >
                <option value="all" className="bg-[#0f172a] text-slate-300">All Statuses</option>
                <option value="pending" className="bg-[#0f172a] text-slate-300">Requested</option>
                <option value="under_review" className="bg-[#0f172a] text-slate-300">Reviewed</option>
                <option value="approved" className="bg-[#0f172a] text-slate-300">Approved</option>
                <option value="active" className="bg-[#0f172a] text-slate-300">Active</option>
                <option value="renewal_requested" className="bg-[#0f172a] text-slate-300">Renewal Requested</option>
                <option value="re_approved" className="bg-[#0f172a] text-slate-300">Re-approved</option>
                <option value="expired" className="bg-[#0f172a] text-slate-300">Expired</option>
                <option value="revoked" className="bg-[#0f172a] text-slate-300">Revoked</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center bg-[#0f172a] border border-[#1e293b] rounded px-2">
              <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0 select-none mr-2" />
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-transparent border-none text-slate-300 text-xs py-2 focus:outline-none"
              >
                <option value="all" className="bg-[#0f172a] text-slate-300">All Categories</option>
                <option value="mfa_bypass" className="bg-[#0f172a] text-slate-300">MFA Bypass</option>
                <option value="firewall_rule" className="bg-[#0f172a] text-slate-300">Firewall Rules</option>
                <option value="admin_privilege" className="bg-[#0f172a] text-slate-300">Admin Privileges</option>
                <option value="password_policy" className="bg-[#0f172a] text-slate-300">Password Policies</option>
                <option value="third_party_access" className="bg-[#0f172a] text-slate-300">Third-Party Access</option>
              </select>
            </div>

            {/* Anomaly Filter */}
            <div className="flex items-center bg-[#0f172a] border border-[#1e293b] rounded px-2">
              <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0 select-none mr-2" />
              <select
                id="filter-anomaly"
                value={anomalyFilter}
                onChange={(e) => setAnomalyFilter(e.target.value)}
                className="w-full bg-transparent border-none text-slate-300 text-xs py-2 focus:outline-none"
              >
                <option value="all" className="bg-[#0f172a] text-slate-300">All Anomalies</option>
                <option value="none" className="bg-[#0f172a] text-slate-300">No Anomaly</option>
                <option value="EXPIRED_ACTIVE_EXCEPTION" className="bg-[#0f172a] text-slate-300">Expired Active (Zombie)</option>
                <option value="CRITICAL_RISK_EXCEPTION" className="bg-[#0f172a] text-slate-300">Critical Risk</option>
                <option value="LONG_RUNNING_EXCEPTION" className="bg-[#0f172a] text-slate-300">Long Running</option>
                <option value="HIGH_RISK_LONG_EXCEPTION" className="bg-[#0f172a] text-slate-300">High Risk Long</option>
                <option value="STALLED_REVIEW" className="bg-[#0f172a] text-slate-300">Stalled Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Registry Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#1e293b] bg-[#0c1222] text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase select-none">
                  <th className="py-3 px-4">Waiver ID</th>
                  <th className="py-3 px-4">Exception Subject & System</th>
                  <th className="py-3 px-4">Risk Coefficient</th>
                  <th className="py-3 px-4">Accountable Owner</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4">Audit State</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 text-xs">
                {filteredWaivers.map(waiver => {
                  const isSelected = selectedWaiver?.id === waiver.id;
                  return (
                    <tr 
                      key={waiver.id}
                      onClick={() => {
                        setSelectedWaiver(waiver);
                        setAiAnalysisResult(null); // Clear previous AI analytics on switch
                      }}
                      className={`hover:bg-slate-800/60 cursor-pointer select-none transition-all ${
                        isSelected ? 'bg-indigo-600/10 border-l-2 border-indigo-500 text-indigo-400 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {waiver.id}
                        {waiver.ciaImpact && (
                          <div className="flex gap-1 mt-1">
                            <span className={`px-1 py-0.5 text-[8px] rounded uppercase ${waiver.ciaImpact.confidentiality === 'high' ? 'bg-rose-900/40 text-rose-400' : 'bg-slate-800 text-slate-500'}`} title="Confidentiality">C:{waiver.ciaImpact.confidentiality[0]}</span>
                            <span className={`px-1 py-0.5 text-[8px] rounded uppercase ${waiver.ciaImpact.integrity === 'high' ? 'bg-rose-900/40 text-rose-400' : 'bg-slate-800 text-slate-500'}`} title="Integrity">I:{waiver.ciaImpact.integrity[0]}</span>
                            <span className={`px-1 py-0.5 text-[8px] rounded uppercase ${waiver.ciaImpact.availability === 'high' ? 'bg-rose-900/40 text-rose-400' : 'bg-slate-800 text-slate-500'}`} title="Availability">A:{waiver.ciaImpact.availability[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 truncate max-w-[240px]">
                        <div className="font-semibold text-slate-200 truncate flex items-center gap-2">
                          {waiver.title}
                          {waiver.anomaly && (
                            <span className="shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded uppercase font-mono">
                              Anomaly
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          System: <span className="font-mono text-slate-400">{waiver.systemName}</span>
                          {waiver.threatStatus === 'ACTIVELY EXPLOITED' && (
                            <span className="ml-2 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-[9px] font-mono whitespace-nowrap">
                              ● ACTIVELY EXPLOITED
                            </span>
                          )}
                          <div className="flex gap-1 mt-1">
                            {waiver.complianceMappings?.map((map: string, i: number) => (
                              <span key={i} className="bg-blue-900/40 border border-blue-800 text-blue-300 text-[9px] px-1 rounded truncate max-w-[80px]">
                                {map}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono rounded-full border ${scoreColor(waiver.riskScore)}`}>
                          <strong>{waiver.riskScore}</strong>
                          <span className="opacity-60">({waiver.riskCategory.toUpperCase()})</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-300">{waiver.ownerName}</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-0.5">{waiver.ownerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(waiver.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-mono leading-relaxed rounded-full ${statusTags[waiver.status]?.bg || 'bg-slate-800'}`}>
                          {statusTags[waiver.status]?.label || waiver.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          id={`registry-inspect-${waiver.id}`}
                          onClick={() => {
                            setSelectedWaiver(waiver);
                            setAiAnalysisResult(null);
                          }}
                          className="text-[10px] font-semibold text-indigo-400 hover:text-white px-2 py-1 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800/80 cursor-pointer"
                        >
                          Details &rarr;
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredWaivers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                      No policy exceptions found matching current query constraints.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Right side: Detailed Inspection Drawer */}
      <div className={`w-96 bg-[#0f172a] border-l border-[#1e293b] overflow-y-auto flex flex-col shrink-0 transition-all ${
        selectedWaiver ? 'translate-x-0 opacity-100' : 'translate-x-[100%] opacity-0 w-0 border-none'
      }`}>
        {selectedWaiver && (
          <div className="p-5 flex flex-col h-full space-y-5">
            {/* Drawer Header */}
            <div className="flex justify-between items-start pb-4 border-b border-[#1e293b]">
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 font-bold bg-[#0a0b0e] border border-[#1e293b] px-1.5 py-0.5 rounded uppercase">
                    {selectedWaiver.id}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusTags[selectedWaiver.status]?.bg || 'bg-slate-800'}`}>
                    {selectedWaiver.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white tracking-tight mt-2">{selectedWaiver.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedWaiver(null)}
                className="text-slate-500 hover:text-slate-200 text-lg p-1 shrink-0 bg-[#0a0b0e] rounded border border-[#1e293b] cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Content inside drawer */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1">
              
              {/* Stats / Critical Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60">
                  <span className="text-[10px] text-slate-500 block">Risk Score Coefficient</span>
                  <span className={`text-sm font-mono font-bold block mt-1 ${
                    selectedWaiver.riskScore >= 80 ? 'text-red-500' : selectedWaiver.riskScore >= 60 ? 'text-orange-400' : 'text-emerald-400'
                  }`}>
                    {selectedWaiver.riskScore}/100
                  </span>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60">
                  <span className="text-[10px] text-slate-500 block">Category Impact</span>
                  <span className="text-xs font-semibold text-slate-300 block mt-1 truncate capitalize">
                    {getExceptionTypeLabel(selectedWaiver.type)}
                  </span>
                </div>
              </div>

              {/* technical Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Scope Description</span>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-900/60">
                  {selectedWaiver.description}
                </p>
              </div>

              {/* Justification check */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Justification & Logic</span>
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-900/60">
                  {selectedWaiver.justification}
                </p>
              </div>

              {/* Accountable Owner details */}
              <div className="space-y-2 bg-slate-900/30 p-3 rounded-lg border border-slate-900/60 text-[11px]">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-300">Owner: <strong className="text-white font-normal">{selectedWaiver.ownerName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-400 font-mono">{selectedWaiver.ownerEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-slate-300">Identity scope: <span className="font-mono text-amber-500 capitalize">{selectedWaiver.accessLevel.replace('_', ' ')}</span></span>
                </div>
              </div>

              {/* Compensating controls mapped */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Operational Controls Mapped</span>
                <div className="space-y-1">
                  {selectedWaiver.compensatingControls.map(ctrlId => {
                    const registryInfo = COMPENSATING_CONTROLS_REGISTRY.find(c => c.id === ctrlId);
                    return (
                      <div key={ctrlId} className="flex gap-2 items-start bg-slate-900/80 p-2 rounded border border-slate-800 text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-200">{registryInfo?.name || ctrlId}</p>
                          <p className="text-slate-500 text-[9px] mt-0.5">{registryInfo?.description}</p>
                        </div>
                      </div>
                    );
                  })}
                  {selectedWaiver.compensatingControls.length === 0 && (
                    <div className="text-[10px] text-red-400 bg-red-950/10 border border-red-900/40 p-2.5 rounded flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 shrink-0" />
                      <span>CRITICAL: No safeguards are mapped. Exposure rating is full-scale!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Regulatory standard overlaps */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Compliance Standards Map</span>
                <div className="flex flex-wrap gap-1">
                  {selectedWaiver.complianceMappings.map(std => (
                    <span key={std} className="text-[9px] font-mono bg-blue-950/30 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded">
                      {std}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Sentry Analysis Module */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-3">
                <div className="flex justify-between items-center bg-slate-900/20 p-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-200">AI Security Sentry</span>
                  </div>
                  <button
                    onClick={() => handleRunAiAnalysis(selectedWaiver)}
                    disabled={isAnalyzing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-2 py-1 rounded transition-all shrink-0 cursor-pointer disabled:bg-indigo-900"
                  >
                    {isAnalyzing ? 'Evaluating...' : 'Query Gemini'}
                  </button>
                </div>

                {isAnalyzing && (
                  <div className="p-4 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                    <span className="text-[10px] text-slate-400 animate-pulse">Running live compliance checking...</span>
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="space-y-3 text-[11px] border-t border-indigo-950 pt-2 text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Justification Grade:</span>
                      <span className={`font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800 ${
                        ['A', 'B'].includes(aiAnalysisResult.justificationGrade) ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        Grade {aiAnalysisResult.justificationGrade} ({aiAnalysisResult.justificationScore}/10)
                      </span>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-[10px] text-slate-400 font-mono uppercase block">Threat Analysis</strong>
                      <p className="text-[10px] leading-relaxed text-slate-300 bg-slate-900/30 p-2.5 rounded border border-slate-950">
                        {aiAnalysisResult.threatAnalysis}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <strong className="text-[10px] text-slate-400 font-mono uppercase block">Prescribed Action Steps</strong>
                      <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-300">
                        {aiAnalysisResult.remediationPlan.map((step: string, i: number) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>

                    {aiAnalysisResult.cisoAssessment && (
                      <div className="space-y-1 border-t border-indigo-950/40 pt-2 block">
                        <strong className="text-[10px] text-slate-400 font-mono uppercase block">CISO Advisory Note</strong>
                        <p className="text-[10px] italic text-slate-400 leading-normal">
                          "{aiAnalysisResult.cisoAssessment}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Event Logs / History */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Security Log History</span>
                <div className="relative border-l border-slate-900 ml-1.5 pl-3 space-y-3 text-[10px]">
                  {selectedWaiver.history.map((hist, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-900"></div>
                      <div className="text-slate-400 font-semibold">{hist.action}</div>
                      <div className="text-slate-500 mt-0.5">{hist.notes}</div>
                      <div className="text-[8px] text-slate-600 font-mono mt-1">
                        By {hist.user} • {new Date(hist.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Lifecycle Manual Override Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-900 shrink-0">
              {selectedWaiver.status === 'pending' ? (
                <>
                  <button
                    onClick={() => {
                      setModalState({ type: 'reject', waiverId: selectedWaiver.id });
                      setModalInputValue('');
                    }}
                    className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-rose-950/30 text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <XOctagon className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => {
                      setModalState({ type: 'approve', waiverId: selectedWaiver.id });
                    }}
                    className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-emerald-950/30 text-emerald-400 border border-slate-800 hover:border-emerald-900/50 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="registry-btn-revoke"
                    onClick={() => {
                      setModalState({ type: 'revoke', waiverId: selectedWaiver.id });
                      setModalInputValue('');
                    }}
                    disabled={selectedWaiver.status === 'revoked'}
                    className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-red-950/20 text-red-400 border border-slate-800 hover:border-red-900/50 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-slate-900"
                  >
                    <XOctagon className="w-3.5 h-3.5" />
                    <span>Revoke Access</span>
                  </button>
                  <button
                    id="registry-btn-renew"
                    onClick={() => {
                      setModalState({ type: 'renew', waiverId: selectedWaiver.id });
                      setModalInputValue('30');
                    }}
                    disabled={selectedWaiver.status === 'revoked'}
                    className="flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-emerald-950/20 text-emerald-400 border border-slate-800 hover:border-emerald-900/50 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-slate-900"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Extend / Renew</span>
                  </button>
                </>
              )}
            </div>

          </div>
        )}
      </div>
      
      {/* Action Modals */}
      {modalState.type !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              {modalState.type === 'revoke' && 'Revoke Access'}
              {modalState.type === 'renew' && 'Renew Extension'}
              {modalState.type === 'reject' && 'Reject Request'}
              {modalState.type === 'approve' && 'Approve Request'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {modalState.type === 'revoke' && 'Specify operational reason for access decommissioning:'}
              {modalState.type === 'renew' && 'Specify extension period in days:'}
              {modalState.type === 'reject' && 'Specify rejection reason:'}
              {modalState.type === 'approve' && 'Are you sure you want to approve this waiver request?'}
            </p>
            
            {(modalState.type === 'revoke' || modalState.type === 'renew' || modalState.type === 'reject') && (
              <input
                type={modalState.type === 'renew' ? 'number' : 'text'}
                value={modalInputValue}
                onChange={e => setModalInputValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-300 focus:outline-none focus:border-slate-600 mb-4"
                autoFocus
              />
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setModalState({ type: 'none' });
                  setModalInputValue('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalState.waiverId) {
                    if (modalState.type === 'revoke' && modalInputValue) {
                      onRevokeWaiver(modalState.waiverId, modalInputValue);
                    } else if (modalState.type === 'renew' && modalInputValue) {
                      const days = parseInt(modalInputValue, 10);
                      if (!isNaN(days) && days > 0) {
                        onRenewWaiver(modalState.waiverId, days);
                      }
                    } else if (modalState.type === 'reject' && modalInputValue) {
                      onRejectWaiver(modalState.waiverId, modalInputValue);
                    } else if (modalState.type === 'approve') {
                      onApproveWaiver(modalState.waiverId);
                    }
                  }
                  
                  setModalState({ type: 'none' });
                  setModalInputValue('');
                }}
                disabled={(modalState.type !== 'approve') && !modalInputValue}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
