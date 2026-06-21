import React, { useState, useEffect } from 'react';
import { PolicyException } from '../types';
import { Activity, RefreshCw } from 'lucide-react';

interface ActivityLogViewProps {
  waivers: PolicyException[];
}

export default function ActivityLogView({ waivers }: ActivityLogViewProps) {
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity_logs');
      const data = await res.json();
      setServerLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Merge server logs and frontend logs
  const allLogs = [
    ...waivers.flatMap(w => 
      w.history.map(h => ({ ...h, exception_id: w.id }))
    ),
    ...serverLogs
  ].filter((log, index, self) => 
    index === self.findIndex((t) => (
      t.exception_id === log.exception_id && t.timestamp === log.timestamp && t.action === log.action
    ))
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="h-full bg-[#0a0b0e] flex flex-col font-sans overflow-hidden text-slate-300">
      <div className="p-6 border-b border-[#1e293b] flex justify-between items-center bg-[#0f172a]">
        <div>
          <h2 className="text-xl font-semibold text-white">System Activity Log</h2>
          <p className="text-xs text-slate-400 mt-1">Immutable audit trail of all lifecycle actions (Server Synchronized)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchLogs} className="text-indigo-400 hover:text-indigo-300 p-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-xs font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded text-slate-300">
            {allLogs.length} Events Recorded
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 border-b border-[#1e293b] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="p-3 pl-4 font-medium">Timestamp</th>
                <th className="p-3 font-medium">Waiver ID</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Operator</th>
                <th className="p-3 w-full font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {allLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 text-xs">No activity historical records found.</td>
                </tr>
              ) : (
                allLogs.map((log, i) => (
                  <tr key={i} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors text-xs text-slate-300">
                    <td className="p-3 pl-4 font-mono text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-mono text-[10px] text-indigo-400">{log.exception_id}</td>
                    <td className="p-3 font-semibold">{log.action}</td>
                    <td className="p-3 text-slate-400">{log.user}</td>
                    <td className="p-3 text-slate-500 truncate max-w-sm">{log.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
