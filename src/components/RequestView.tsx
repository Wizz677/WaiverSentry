/**
 * Policy Exception Request Submission Form & Real-time Risk Simulator
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PolicyException, ExceptionType, AccessLevel, BusinessCriticality } from '../types';
import { calculateWaiverRisk, COMPENSATING_CONTROLS_REGISTRY } from '../utils/riskEngine';
import { 
  FilePlus2, 
  ShieldCheck, 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  HelpCircle, 
  AlertTriangle, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface RequestViewProps {
  onSubmitWaiver: (newWaiver: Omit<PolicyException, 'id' | 'createdAt' | 'status' | 'reviews' | 'history' | 'lastReviewedAt' | 'complianceMappings' | 'riskScore' | 'riskCategory'>) => void;
}

export default function RequestView({ onSubmitWaiver }: RequestViewProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ExceptionType>('mfa_bypass');
  const [systemName, setSystemName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [approver, setApprover] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('regular_user');
  const [businessCriticality, setBusinessCriticality] = useState<BusinessCriticality>('medium');
  const [durationDays, setDurationDays] = useState(30);
  const [justification, setJustification] = useState('');
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  
  // Dynamic Risk State calculated in real-time
  const [riskValue, setRiskValue] = useState(0);
  const [riskCat, setRiskCat] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [riskBreakdown, setRiskBreakdown] = useState<any>(null);

  // AI Justification optimizer state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedTip, setEnhancedTip] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Math simulation calculations on change
  useEffect(() => {
    // Mock date to calculate duration
    const created = new Date().toISOString();
    const expires = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const evaluation = calculateWaiverRisk({
      type,
      accessLevel,
      businessCriticality,
      createdAt: created,
      expiresAt: expires,
      compensatingControls: selectedControls,
      justificationScore: justification.length > 50 ? 8 : justification.length > 15 ? 5 : 2
    });

    setRiskValue(evaluation.riskScore);
    setRiskCat(evaluation.riskCategory);
    setRiskBreakdown(evaluation);
  }, [type, accessLevel, businessCriticality, durationDays, selectedControls, justification]);

  const handleControlToggle = (id: string) => {
    if (selectedControls.includes(id)) {
      setSelectedControls(selectedControls.filter(c => c !== id));
    } else {
      setSelectedControls([...selectedControls, id]);
    }
  };

  // Trigger Gemini service-side call to check & optimize the justification
  const handleEnhanceJustification = async () => {
    if (!justification || justification.length < 10) {
      alert('Please enter at least a brief justification first to let Gemini analyze it.');
      return;
    }

    setIsEnhancing(true);
    setEnhancedTip(null);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Please review this draft business justification for a security policy waiver and provide an enhanced, professional version that GRC auditors will accept, plus 2-3 technical considerations:\n\nDraft Justification: "${justification}"\n\nException Type: \`${type}\` on a \`${businessCriticality}\` business criticality asset.`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Copilot API failed');
      }

      const resJson = await response.json();
      setEnhancedTip(resJson.text);
    } catch (e: any) {
      console.error(e);
      // Fallback tip
      setEnhancedTip(`**Recommended Justification Draft:**\n"To support critical pipeline operations, we require custom CIDR whitelisting bounds. Outages inhibit daily build cycles. Transitioning tool capabilities is currently blocked by API legacy endpoints, requiring this tactical temporary waiver."`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApplyEnhancedText = () => {
    if (enhancedTip) {
      // Simple parse to extract text between double quotes if present, or just use the core lines block
      const cleanText = enhancedTip.replace(/\*\*[^*]+\*\*/g, '').trim();
      setJustification(cleanText.slice(0, 320)); // Limit to standard inputs
      setEnhancedTip(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !systemName || !ownerName || !justification || !approver) {
      setValidationError('Please fill out all required fields before registry enrollment.');
      return;
    }
    setValidationError(null);

    onSubmitWaiver({
      title,
      description,
      type,
      systemName,
      ownerName,
      ownerEmail: ownerEmail || `${ownerName.toLowerCase().replace(/\s/g, '.')}@company-secure.com`,
      approver,
      accessLevel,
      businessCriticality,
      expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      justification,
      justificationScore: justification.length > 50 ? 8 : justification.length > 15 ? 5 : 2,
      compensatingControls: selectedControls
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setSystemName('');
    setOwnerName('');
    setOwnerEmail('');
    setApprover('');
    setJustification('');
    setSelectedControls([]);
    setEnhancedTip(null);

    alert('Waiver request enrolled successfully and routed into GRC Review queue!');
  };

  const ringColor = (cat: string) => {
    if (cat === 'critical') return 'border-red-500 text-red-500';
    if (cat === 'high') return 'border-orange-500 text-orange-400';
    if (cat === 'medium') return 'border-amber-500 text-amber-400';
    return 'border-emerald-500 text-emerald-400';
  };

  const bgGradient = (cat: string) => {
    if (cat === 'critical') return 'from-red-950/20 to-transparent border-red-950/60 bg-red-950/5';
    if (cat === 'high') return 'from-orange-950/20 to-transparent border-orange-950/60 bg-orange-950/5';
    if (cat === 'medium') return 'from-amber-950/20 to-transparent border-amber-950/60 bg-amber-950/5';
    return 'from-emerald-950/20 to-transparent border-emerald-950/60 bg-emerald-950/5';
  };

  return (
    <div className="h-full flex text-slate-100 overflow-hidden">
      
      {/* Form Area */}
      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto max-w-2xl">
        
        <div>
          <h2 id="submission-heading" className="text-xl font-semibold text-white tracking-tight">Request Core Exception Waiver</h2>
          <p className="text-xs text-slate-400 mt-1">Submit technical details regarding business process exceptions. The risk engine evaluates variables dynamically.</p>
        </div>

        <div className="space-y-4">
          
          {/* Section 1: Classification */}
          <div className="space-y-3 bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase font-mono">1. Category Definition</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5Col">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Waiver Name / Title *</label>
                <input
                  id="req-title"
                  type="text"
                  required
                  placeholder="e.g. Temporary Port Tunnel for Contractor Account"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="space-y-1.5col">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Exception Type *</label>
                <select
                  id="req-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as ExceptionType)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                >
                  <option value="mfa_bypass">Multi-Factor Authentication Bypass</option>
                  <option value="firewall_rule">Inbound Firewall Opening Exception</option>
                  <option value="admin_privilege">Super Admin / Root Account Bypass</option>
                  <option value="password_policy">Complexity & Rotation Policy Excursion</option>
                  <option value="third_party_access">External Partner Sandbox Trust opening</option>
                  <option value="other">General GRC Process Waver</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-400 block">Scope & Systems Affected (Technical Detail)</label>
              <textarea
                id="req-desc"
                rows={2}
                placeholder="Briefly declare host IPs, VM signatures, or network subnets targeted by this bypass."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Asset details */}
          <div className="space-y-3 bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase font-mono">2. System Parameters & Ownership</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Target Server or Database *</label>
                <input
                  id="req-sysname"
                  type="text"
                  required
                  placeholder="e.g. AWS AWS-PROD-ORACLE-01"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 block">Credential Level</label>
                  <select
                    id="req-access"
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono"
                  >
                    <option value="super_admin">C-Root / Admin</option>
                    <option value="service_account">Svc Account</option>
                    <option value="regular_user">User Accounts</option>
                    <option value="read_only">Read-Only API</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 block">Criticality</label>
                  <select
                    id="req-criticality"
                    value={businessCriticality}
                    onChange={(e) => setBusinessCriticality(e.target.value as BusinessCriticality)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-semibold"
                  >
                    <option value="critical" className="text-red-400 font-semibold">Critical Prod</option>
                    <option value="high" className="text-orange-400 font-semibold">High Stg</option>
                    <option value="medium" className="text-amber-400">Medium Internal</option>
                    <option value="low" className="text-emerald-400">Low Dev</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Owner Name *</label>
                <input
                  id="req-ownername"
                  type="text"
                  required
                  placeholder="e.g. Abdullah S."
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Approver Name *</label>
                <input
                  id="req-approver"
                  type="text"
                  required
                  placeholder="e.g. John D."
                  value={approver}
                  onChange={(e) => setApprover(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] uppercase font-mono text-slate-400 block">Timeline (Duration)</label>
                <select
                  id="req-duration"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 font-mono"
                >
                  <option value={7}>Tactical Operations (7 Days)</option>
                  <option value={30}>Standard Operations (30 Days)</option>
                  <option value={90}>Extended Integration (90 Days)</option>
                  <option value={180}>Strategic Permanent Waiver (180 Days)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Justification and GRC AI optimizer */}
          <div className="space-y-3 bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-white tracking-widest uppercase font-mono">3. Auditor-Defensible Justification</h3>
              <button
                type="button"
                id="req-btn-optimize"
                disabled={isEnhancing}
                onClick={handleEnhanceJustification}
                className="text-[10px] font-semibold text-blue-400 hover:text-white flex items-center gap-1 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded cursor-pointer disabled:bg-slate-900"
              >
                {isEnhancing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-3 h-3 text-blue-400" />
                    <span>Gemini Optimize</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <textarea
                id="req-justification"
                required
                rows={3}
                placeholder="Explain EXACTLY why you cannot maintain compliance with standard security architecture controls or why a software overhaul is unavailable."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-slate-700 resize-none font-sans"
              />
            </div>

            {enhancedTip && (
              <div id="ai-optimized-preview" className="bg-blue-950/10 border border-blue-900/40 rounded-lg p-3 space-y-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-blue-400 flex items-center gap-1 font-mono">
                    <Sparkles className="w-3 h-3" />
                    AI Optimized Justification Result
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyEnhancedText}
                    className="text-[9px] font-semibold bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                <p className="text-[10px] italic text-slate-300 leading-normal max-h-24 overflow-y-auto">
                  {enhancedTip}
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Mapped Compensating controls multi-select */}
          <div className="space-y-3 bg-[#0f172a] p-4 rounded-xl border border-[#1e293b]">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase font-mono">4. Mapped Compensating Safeguards</h3>
            
            <div className="space-y-2">
              {COMPENSATING_CONTROLS_REGISTRY.map(ctrl => {
                const isChecked = selectedControls.includes(ctrl.id);
                return (
                  <label 
                    key={ctrl.id} 
                    className={`flex gap-3 items-start p-2.5 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked 
                        ? 'bg-emerald-950/10 border-emerald-900/50 text-slate-200' 
                        : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 text-slate-400 font-normal'
                    }`}
                  >
                    <input
                      id={`req-control-${ctrl.id}`}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleControlToggle(ctrl.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{ctrl.name}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{ctrl.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {validationError && (
            <div className="bg-red-950/20 text-red-400 border border-red-900/50 p-3 rounded text-xs font-mono font-medium">
              {validationError}
            </div>
          )}

          {/* Submission button */}
          <button
            type="submit"
            id="form-btn-submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-3 rounded flex items-center justify-center gap-2 uppercase tracking-widest font-mono cursor-pointer transition-all border border-transparent shadow shadow-indigo-950"
          >
            <span>File Waiver Enrollment</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>
      </form>

      {/* Real-time Math Score HUD Pane */}
      <div className="w-80 bg-[#0f172a] border-l border-[#1e293b] p-5 flex flex-col justify-between shrink-0 overflow-y-auto text-slate-300">
        
        <div className="space-y-4">
          <div className="pb-3 border-b border-slate-900">
            <h3 className="text-xs font-semibold text-white tracking-widest uppercase font-mono">Real-Time Risk Hud</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Continuous mathematical check pre-submission</p>
          </div>

          {/* Radial score projection compute */}
          {riskBreakdown && (
            <div className={`p-4 rounded-xl border flex flex-col items-center bg-gradient-to-b ${bgGradient(riskCat)}`}>
              <div className={`w-28 h-28 rounded-full border-4 flex flex-col justify-center items-center ${ringColor(riskCat)} bg-slate-950 shadow-inner`}>
                <span className="text-3xl font-extrabold font-mono text-white leading-none">
                  {riskValue}
                </span>
                <span className="text-[8px] font-mono font-bold tracking-widest uppercase text-slate-500 mt-1">
                  Risk Score
                </span>
              </div>
              <div className="text-center mt-3">
                <span className="text-xs font-extrabold uppercase tracking-widest font-mono text-white block">
                  {riskCat} Risk Status
                </span>
                <span className="text-[9px] text-slate-400 font-normal mt-0.5 block">
                  Exception: {durationDays} days duration penalty applied.
                </span>
              </div>
            </div>
          )}

          {/* Detailed mathematics outputs */}
          {riskBreakdown && (
            <div className="space-y-2 text-[11px] bg-slate-900/20 p-3 rounded-lg border border-slate-900/60 font-mono">
              <span className="text-[10px] font-semibold text-white tracking-wider block font-sans">Formula Factor Variables</span>
              
              <div className="flex justify-between border-b border-slate-900 pb-1 text-[10px]">
                <span className="text-slate-500">Base Risk Value:</span>
                <span className="text-slate-300">{riskBreakdown.baseComponent} pts</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1 text-[10px]">
                <span className="text-slate-500">Credential Multiplier:</span>
                <span className="text-amber-500">{riskBreakdown.accessMultiplier.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1 text-[10px]">
                <span className="text-slate-500">Criticality Multiplier:</span>
                <span className="text-red-400">{riskBreakdown.criticalityMultiplier.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1 text-[10px]">
                <span className="text-slate-500">Duration Penalty:</span>
                <span className="text-orange-400">{riskBreakdown.durationPenalty.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1 text-[10px]">
                <span className="text-slate-500">Mitigation Discount:</span>
                <span className="text-emerald-400">-{Math.round((1 - riskBreakdown.discountFactor) * 100)}%</span>
              </div>
            </div>
          )}

          {/* Safe-to-submit warnings */}
          {riskBreakdown && (
            <div className="space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-900/60">
              <div className="flex gap-2 text-xs">
                <AlertTriangle className={`w-4 h-4 shrink-0 shrink-0 ${riskValue >= 70 ? 'text-red-500' : 'text-slate-500'}`} />
                <span className="font-semibold text-white">Board Review Guard</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                {riskValue >= 80 
                  ? 'CRITICAL ALERT: Enrolling this waiver will automatically page-out the Chief Information Security Officer (CISO) due to severe exposure levels.' 
                  : riskValue >= 50
                  ? 'High Attention: This waiver requires active compensation with whitelisting boundaries or SIEM auditing elements to prevent structural drift.'
                  : 'Standard: Self-service audit path authorized. Mappings are aligned.'}
              </p>
            </div>
          )}

        </div>

        <div className="text-[9px] text-slate-600 font-mono pt-4 leading-normal select-none">
          Formula: Risk = Base * Privileges * Criticality * Duration * (1 - Mitigations). Overdue instances are subject to an immediate +20 pts penalty block.
        </div>

      </div>
      
    </div>
  );
}
