import React from 'react';
import { Target } from 'lucide-react';

export default function SuccessCriteriaView() {
  return (
    <div className="h-full bg-[#0a0b0e] flex flex-col font-sans overflow-y-auto text-slate-300">
      <div className="p-6 border-b border-[#1e293b] bg-[#0f172a] sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Success Criteria Tracking</h2>
          <p className="text-xs text-slate-400 mt-1">Hackathon requirements matrix</p>
        </div>
        <div className="text-xs font-mono bg-indigo-600 border border-indigo-500 px-3 py-1 rounded text-white flex items-center gap-2">
          Approach: Option A
        </div>
      </div>
      
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-4 border-b border-[#1e293b] pb-2">
            <Target className="w-5 h-5" /> Engine Validation
          </div>
          
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span> <span>Input schema is exactly: exception_id, type, requester, approver, justification, start_date, end_date, status, risk_level.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span> <span>Per-record output is exactly: {'{ exception_id, risk_level, alerts[], recommendation }'}.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✓</span> <span>Alert codes implemented: EXPIRED_NOT_REVOKED, OVERDUE_RENEWAL, ELEVATED_PRIVILEGE, LONG_DURATION, NO_RENEWAL_90_DAYS, STALLED_REVIEW, VAGUE_JUSTIFICATION.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
