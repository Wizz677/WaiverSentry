/**
 * Main Application Hub & State Router for WaiverSentry
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import RegistryView from './components/RegistryView';
import RequestView from './components/RequestView';
import AlertsView from './components/AlertsView';
import OfficialOutputView from './components/OfficialOutputView';
import ActivityLogView from './components/ActivityLogView';
import SuccessCriteriaView from './components/SuccessCriteriaView';
import { Menu, X } from 'lucide-react';

import { PolicyException } from './types';
import { SYNTHETIC_WAIVERS } from './data/seedGenerator';
import { calculateWaiverRisk, mapToStandards } from './utils/riskEngine';

const STORAGE_KEY = 'WaiverSentry_Registry_V2';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [waivers, setWaivers] = useState<PolicyException[]>([]);
  const [selectedWaiver, setSelectedWaiver] = useState<PolicyException | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load datasets either from localStorage (for persistent demo editing) or use the preloads
  useEffect(() => {
    let initialWaivers = SYNTHETIC_WAIVERS;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        initialWaivers = JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached registry database. Falling back to preloaded data.', e);
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialWaivers));
    }
    setWaivers(initialWaivers);
  }, []);

  const saveToStorageAndState = (updatedList: PolicyException[]) => {
    setWaivers(updatedList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    
    // Quick sync of any new histories
    const allHistory = updatedList.flatMap(w => 
      w.history.map(h => ({ ...h, exception_id: w.id }))
    );
    // Grab the newest one
    const latest = allHistory.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (latest) {
      fetch('/api/activity_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest)
      }).catch(() => {});
    }
  };

  // 1. OPERATION: RENEW EXCEPTION EXTENSION
  const handleRenewWaiver = (id: string, extensionDays: number) => {
    const updated = waivers.map(w => {
      if (w.id === id) {
        const originalExpiry = new Date(w.expiresAt);
        const newExpiry = new Date(originalExpiry.getTime() + extensionDays * 24 * 60 * 60 * 1000).toISOString();
        
        const historyItem = {
          timestamp: new Date().toISOString(),
          action: 'Extended',
          user: 'SecOps Lead Auditor',
          notes: `Authorized schedule extension for exactly ${extensionDays} additional days.`
        };

        const updatedWaiverPartial = {
          ...w,
          expiresAt: newExpiry,
          history: [historyItem, ...w.history],
          lastReviewedAt: new Date().toISOString(),
          status: w.status === 'expired' ? 'active' : w.status // Reset status to active if was expired
        };

        // Recalculate risk parameters
        const evaluation = calculateWaiverRisk(updatedWaiverPartial as Partial<PolicyException>);
        const updatedWaiver = {
          ...updatedWaiverPartial,
          riskScore: evaluation.riskScore,
          riskCategory: evaluation.riskCategory
        };

        if (selectedWaiver?.id === id) {
          setSelectedWaiver(updatedWaiver);
        }

        fetch('/api/waivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            exception_id: updatedWaiver.id,
            type: updatedWaiver.type,
            requester: updatedWaiver.ownerName,
            approver: updatedWaiver.approver || 'System Admin',
            justification: updatedWaiver.justification,
            start_date: updatedWaiver.createdAt.split('T')[0],
            end_date: updatedWaiver.expiresAt.split('T')[0],
            status: updatedWaiver.status,
            risk_level: updatedWaiver.riskCategory.toUpperCase()
          }])
        }).catch(console.error);

        return updatedWaiver;
      }
      return w;
    });

    saveToStorageAndState(updated);
  };

  // 2. OPERATION: MANDATORY REVOCATION BLOCKADE
  const handleRevokeWaiver = (id: string, reason: string) => {
    const updated = waivers.map(w => {
      if (w.id === id) {
        const historyItem = {
          timestamp: new Date().toISOString(),
          action: 'Revoked',
          user: 'SecOps Lead Auditor',
          notes: `Bypass authorization manually revoked. Reason: ${reason}`
        };

        const updatedWaiverPartial = {
          ...w,
          status: 'revoked' as const,
          history: [historyItem, ...w.history],
          lastReviewedAt: new Date().toISOString()
        };

        // Recalculate risk parameters
        const evaluation = calculateWaiverRisk(updatedWaiverPartial as Partial<PolicyException>);
        const updatedWaiver = {
          ...updatedWaiverPartial,
          riskScore: evaluation.riskScore,
          riskCategory: evaluation.riskCategory
        };

        if (selectedWaiver?.id === id) {
          setSelectedWaiver(updatedWaiver);
        }

        fetch('/api/waivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            exception_id: updatedWaiver.id,
            type: updatedWaiver.type,
            requester: updatedWaiver.ownerName,
            approver: updatedWaiver.approver || 'System Admin',
            justification: updatedWaiver.justification,
            start_date: updatedWaiver.createdAt.split('T')[0],
            end_date: updatedWaiver.expiresAt.split('T')[0],
            status: updatedWaiver.status,
            risk_level: updatedWaiver.riskCategory.toUpperCase()
          }])
        }).catch(console.error);

        return updatedWaiver;
      }
      return w;
    });

    saveToStorageAndState(updated);
  };

  const handleApproveWaiver = (id: string) => {
    const updated = waivers.map(w => {
      if (w.id === id) {
        const historyItem = {
          timestamp: new Date().toISOString(),
          action: 'Approved',
          user: 'System Admin',
          notes: 'Exception approved into the registry.'
        };

        const updatedWaiver = {
          ...w,
          status: 'active' as const,
          history: [historyItem, ...w.history],
          lastReviewedAt: new Date().toISOString()
        };

        if (selectedWaiver?.id === id) {
          setSelectedWaiver(updatedWaiver);
        }

        fetch('/api/waivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            exception_id: updatedWaiver.id,
            type: updatedWaiver.type,
            requester: updatedWaiver.ownerName,
            approver: updatedWaiver.approver || 'System Admin',
            justification: updatedWaiver.justification,
            start_date: updatedWaiver.createdAt.split('T')[0],
            end_date: updatedWaiver.expiresAt.split('T')[0],
            status: updatedWaiver.status,
            risk_level: updatedWaiver.riskCategory.toUpperCase()
          }])
        }).catch(console.error);

        return updatedWaiver;
      }
      return w;
    });

    saveToStorageAndState(updated);
  };

  const handleRejectWaiver = (id: string, reason: string) => {
    const updated = waivers.map(w => {
      if (w.id === id) {
        const historyItem = {
          timestamp: new Date().toISOString(),
          action: 'Rejected',
          user: 'System Admin',
          notes: `Exception request rejected. Reason: ${reason}`
        };

        const updatedWaiver = {
          ...w,
          status: 'revoked' as const, // using revoked or we can just leave it as revoked for simplification
          history: [historyItem, ...w.history],
          lastReviewedAt: new Date().toISOString()
        };

        if (selectedWaiver?.id === id) {
          setSelectedWaiver(updatedWaiver);
        }

        fetch('/api/waivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            exception_id: updatedWaiver.id,
            type: updatedWaiver.type,
            requester: updatedWaiver.ownerName,
            approver: updatedWaiver.approver || 'System Admin',
            justification: updatedWaiver.justification,
            start_date: updatedWaiver.createdAt.split('T')[0],
            end_date: updatedWaiver.expiresAt.split('T')[0],
            status: updatedWaiver.status,
            risk_level: updatedWaiver.riskCategory.toUpperCase()
          }])
        }).catch(console.error);

        return updatedWaiver;
      }
      return w;
    });

    saveToStorageAndState(updated);
  };

  // 3. OPERATION: SUBMIT NEW EXCEPTION TO REGISTRY
  const handleSubmitWaiver = (newWaiverData: any) => {
    // Generate new unique Code ID
    const currentYear = new Date().getFullYear();
    const sequenceNum = waivers.length + 42; // arbitrary sequential seed
    const newId = `WVR-${currentYear}-00${sequenceNum}`;

    const creationDate = new Date().toISOString();
    
    const historyItem = {
      timestamp: creationDate,
      action: 'Requested',
      user: newWaiverData.ownerName,
      notes: `Exception submitted for GRC review audit cycle.`
    };

    const initialWaiverPartial = {
      ...newWaiverData,
      id: newId,
      createdAt: creationDate,
      status: 'pending' as const,
      reviews: [],
      history: [historyItem],
      lastReviewedAt: null
    };

    // Evaluate risk and mappings
    const evaluation = calculateWaiverRisk(initialWaiverPartial as Partial<PolicyException>);
    const standards = mapToStandards(newWaiverData.type);

    const completedWaiver: PolicyException = {
      ...initialWaiverPartial,
      riskScore: evaluation.riskScore,
      riskCategory: evaluation.riskCategory,
      complianceMappings: standards
    };

    // ALSO send quietly to exactly schema-ed API backing store!
    fetch('/api/waivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        exception_id: completedWaiver.id,
        type: completedWaiver.type,
        requester: completedWaiver.ownerName,
        approver: completedWaiver.approver || 'System Admin',
        justification: completedWaiver.justification,
        start_date: completedWaiver.createdAt.split('T')[0],
        end_date: completedWaiver.expiresAt.split('T')[0],
        status: completedWaiver.status,
        risk_level: completedWaiver.riskCategory.toUpperCase()
      }])
    }).catch(console.error);

    const updatedList = [completedWaiver, ...waivers];
    saveToStorageAndState(updatedList);
  };

  // Navigation callbacks
  const handleInspectWaiver = (waiver: PolicyException) => {
    setSelectedWaiver(waiver);
    setActiveTab('registry');
  };

  const pendingCount = waivers.filter(w => w.status === 'pending').length;
  // Critical threats are scores >= 80 or status is expired
  const criticalCount = waivers.filter(w => (w.riskScore >= 80 || w.status === 'expired') && w.status !== 'revoked').length;

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#0a0b0e] font-sans">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0f172a] border-b border-slate-800 shrink-0">
        <h1 className="text-white font-bold tracking-widest text-sm uppercase">WaiverSentry</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Universal Navigation Sidebar */}
      <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col fixed inset-0 z-50 md:relative w-full md:w-64 shrink-0`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }} 
          pendingCount={pendingCount} 
          criticalCount={criticalCount} 
        />
      </div>

      {/* Main Routing Screen Canvas */}
      <main className="flex-1 bg-[#0a0b0e] flex flex-col min-w-0 h-[calc(100vh-60px)] md:h-full overflow-hidden">
        
        {activeTab === 'dashboard' && (
          <DashboardView 
            waivers={waivers} 
            onSelectTab={setActiveTab} 
            onInspectWaiver={handleInspectWaiver} 
          />
        )}

        {activeTab === 'official-output' && (
          <OfficialOutputView />
        )}

        {activeTab === 'registry' && (
          <RegistryView 
            waivers={waivers} 
            onRenewWaiver={handleRenewWaiver} 
            onRevokeWaiver={handleRevokeWaiver} 
            onApproveWaiver={handleApproveWaiver}
            onRejectWaiver={handleRejectWaiver}
            selectedWaiver={selectedWaiver}
            setSelectedWaiver={setSelectedWaiver}
          />
        )}

        {activeTab === 'request' && (
          <RequestView 
            onSubmitWaiver={handleSubmitWaiver} 
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsView waivers={waivers} />
        )}

        {activeTab === 'activity' && (
          <ActivityLogView waivers={waivers} />
        )}

        {activeTab === 'criteria' && (
          <SuccessCriteriaView />
        )}

      </main>

    </div>
  );
}
