import { evaluateWaiver } from './exactEngine';

const testWaiver = {
  exception_id: 'EXC-00145',
  type: 'admin_access',
  requester: 'bob.dylan',
  approver: 'sam.sepiol',
  justification: 'Temporary',
  start_date: '2025-10-15',
  end_date: '2025-12-15',
  status: 'ACTIVE',
  risk_level: 'HIGH',
  renewal_count: 0
};

const result = evaluateWaiver(testWaiver);
console.log('Result:', JSON.stringify(result, null, 2));

const pass = result.risk_level === 'CRITICAL' && result.alerts.length === 3 && result.recommendation === 'REVOKE';

if (pass) {
  console.log('ACCEPTANCE TEST PASSED');
  process.exit(0);
} else {
  console.error('ACCEPTANCE TEST FAILED');
  process.exit(1);
}
