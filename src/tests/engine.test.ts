import { strict as assert } from 'node:assert';
import { calculateWaiverRisk } from '../utils/riskEngine';

const mockWaiver = {
  id: 'WVR-TEST',
  title: 'Test',
  type: 'other' as const,
  ownerName: 'Admin',
  justification: 'Test',
  compensatingControls: [],
  anomaly: null,
  threatStatus: null,
  businessCriticality: 'high' as const,
  status: 'active' as const,
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  history: []
};

function runTests() {
  console.log('Running Risk Engine tests...');
  const res = calculateWaiverRisk(mockWaiver);
  
  assert(res.riskScore >= 0 && res.riskScore <= 100, 'Score out of bounds');
  console.log('✅ Base risk calculation works');

  const highRiskWaiver = {
    ...mockWaiver,
    status: 'expired'
  };
  const res2 = calculateWaiverRisk(highRiskWaiver as any);
  assert(res2.riskScore > res.riskScore, 'Expired status should increase risk');
  console.log('✅ Operational penalties increase risk');

  console.log('ALL TESTS PASSED.');
}

runTests();
