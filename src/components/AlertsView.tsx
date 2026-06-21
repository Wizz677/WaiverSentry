import React, { useState } from 'react';
import { PolicyException } from '../types';
import { Mail, Clock, ShieldAlert, CheckCircle, RefreshCcw, Send, Loader2 } from 'lucide-react';

interface AlertsViewProps {
  waivers: PolicyException[];
}

export default function AlertsView({ waivers }: AlertsViewProps) {
  const [sendingAlerts, setSendingAlerts] = useState<Record<string, boolean>>({});
  const [sentAlerts, setSentAlerts] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const handleSendAlert = async (waiverId: string, alertType: string, emailTo: string, subject: string, html: string) => {
    const key = `${waiverId}-${alertType}`;
    setSendingAlerts(prev => ({ ...prev, [key]: true }));
    setResults(prev => ({ ...prev, [key]: '' }));

    try {
      const response = await fetch('/api/alerts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailTo,
          subject,
          html,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSentAlerts(prev => ({ ...prev, [key]: true }));
        setResults(prev => ({ ...prev, [key]: data.mock ? '(Mocked Console Log)' : 'Sent' }));
      } else {
        setResults(prev => ({ ...prev, [key]: `Error: ${data.error}` }));
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, [key]: `Error: ${error.message}` }));
    } finally {
      setSendingAlerts(prev => ({ ...prev, [key]: false }));
    }
  };

  // 1. Email approver when exception expires in 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = waivers.filter(w => new Date(w.expiresAt) <= sevenDaysFromNow && w.status !== 'revoked' && w.status !== 'expired');

  // 2. Escalate if renewal requested but not approved
  const escalatedRenewals = waivers.filter(w => w.status === 'renewal_requested');

  // 3. Flag exceptions older than 12 months ("Is this still needed?")
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const olderThan12Months = waivers.filter(w => new Date(w.createdAt) <= twelveMonthsAgo && w.status === 'active');

  return (
    <div className="h-full bg-[#0a0b0e] flex flex-col font-sans overflow-hidden p-6 animate-in fade-in duration-500">
      <div className="pb-4 border-b border-[#1e293b] mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-400" />
            Automated Alert System
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated webhook and email notification lifecycle bounds.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {/* Requirement 1: Expiring within 7 days */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            Approver Alerts: Expiring Within 7 Days
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Emails dispatched to approvers when active exceptions are approaching auto-revocation.
          </p>
          <div className="space-y-3">
            {expiringSoon.slice(0, 5).map(w => {
              const to = w.ownerEmail || 'approver@company-secure.com';
              const subject = `Action Required: Waiver ${w.id} Expiring`;
              const html = `<p>Hello,</p><p>Your policy exception <b>${w.id}: ${w.title}</b> is expiring within 7 days on ${new Date(w.expiresAt).toLocaleDateString()}. Please initiate explicit renewal or let it gracefully expire.</p>`;
              const key = `${w.id}-expiry`;
              return (
              <div key={w.id} className="bg-[#0a0b0e] border border-slate-800 p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 mb-1 block">To: {to}</span>
                  <strong className="text-xs text-slate-200 block">{subject}</strong>
                  <span className="text-[10px] text-slate-500">{w.title}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  {results[key] && <span className="text-[10px] text-slate-400 font-mono">{results[key]}</span>}
                  <button 
                    onClick={() => handleSendAlert(w.id, 'expiry', to, subject, html)}
                    disabled={sendingAlerts[key] || sentAlerts[key]}
                    className="text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1 rounded inline-flex justify-center items-center gap-1 border border-indigo-500/20 disabled:opacity-50 transition-colors"
                  >
                    {sendingAlerts[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : (sentAlerts[key] ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />)} 
                    {sendingAlerts[key] ? 'Sending' : (sentAlerts[key] ? 'Sent' : 'Send Alert')}
                  </button>
                </div>
              </div>
              );
            })}
            {expiringSoon.length === 0 && <span className="text-xs text-slate-500 font-mono">No exceptions expiring within 7 days.</span>}
          </div>
        </div>

        {/* Requirement 2: Escalate Renewal */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <RefreshCcw className="w-4 h-4 text-rose-400" />
            Escalation: Renewals Requested but Not Approved
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Immediate escalation tickets routed to CISO when a waiver is in stalled review past its bound.
          </p>
          <div className="space-y-3">
            {escalatedRenewals.slice(0, 5).map(w => {
              const to = 'CISO-Office@waiversentry.com';
              const subject = `ESCALATION: ${w.id} Review Stalled`;
              const html = `<p>CISO Office,</p><p>Exception <b>${w.id}</b> renewal has been stalled in review and requires immediate attention to avoid operational blockade.</p>`;
              const key = `${w.id}-escalation`;
              return (
              <div key={w.id} className="bg-[#0a0b0e] border border-slate-800 p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-rose-400 mb-1 block">To: {to}</span>
                  <strong className="text-xs text-slate-200 block">{subject}</strong>
                  <span className="text-[10px] text-slate-500">{w.title}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  {results[key] && <span className="text-[10px] text-slate-400 font-mono">{results[key]}</span>}
                  <button 
                    onClick={() => handleSendAlert(w.id, 'escalation', to, subject, html)}
                    disabled={sendingAlerts[key] || sentAlerts[key]}
                    className="text-[10px] bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-1 rounded inline-flex justify-center items-center gap-1 border border-rose-500/20 disabled:opacity-50 transition-colors"
                  >
                    {sendingAlerts[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : (sentAlerts[key] ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />)} 
                    {sendingAlerts[key] ? 'Sending' : (sentAlerts[key] ? 'Sent' : 'Send Escalation')}
                  </button>
                </div>
              </div>
              );
            })}
            {escalatedRenewals.length === 0 && <span className="text-xs text-slate-500 font-mono">No stalled renewals needing escalation.</span>}
          </div>
        </div>

        {/* Requirement 3: Older than 12 months */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-purple-400" />
            Flagged Reviews: Older than 12 Months
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            "Is this still needed?" recertification campaign emails sent to owners with aged exceptions.
          </p>
          <div className="space-y-3">
            {olderThan12Months.slice(0, 5).map(w => {
              const to = w.ownerEmail || 'owner@company-secure.com';
              const subject = `Action Req: Does ${w.id} still need to exist?`;
              const html = `<p>Hello,</p><p>Your policy exception <b>${w.id}: ${w.title}</b> has been active for over 12 months. Please recertify that this exception is still necessary or initiate sunsetting procedures.</p>`;
              const key = `${w.id}-aged`;
              return (
              <div key={w.id} className="bg-[#0a0b0e] border border-slate-800 p-3 rounded flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-purple-400 mb-1 block">To: {to}</span>
                  <strong className="text-xs text-slate-200 block">{subject}</strong>
                  <span className="text-[10px] text-slate-500">Aged {Math.floor((Date.now() - new Date(w.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days. System: {w.systemName}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  {results[key] && <span className="text-[10px] text-slate-400 font-mono">{results[key]}</span>}
                  <button 
                    onClick={() => handleSendAlert(w.id, 'aged', to, subject, html)}
                    disabled={sendingAlerts[key] || sentAlerts[key]}
                    className="text-[10px] bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1 rounded inline-flex justify-center items-center gap-1 border border-purple-500/20 disabled:opacity-50 transition-colors"
                  >
                    {sendingAlerts[key] ? <Loader2 className="w-3 h-3 animate-spin" /> : (sentAlerts[key] ? <CheckCircle className="w-3 h-3" /> : <Send className="w-3 h-3" />)} 
                    {sendingAlerts[key] ? 'Sending' : (sentAlerts[key] ? 'Sent' : 'Send Chaser')}
                  </button>
                </div>
              </div>
              );
            })}
            {olderThan12Months.length === 0 && <span className="text-xs text-slate-500 font-mono">No exceptions older than 12 months.</span>}
          </div>
        </div>

      </div>
    </div>
  );
}
