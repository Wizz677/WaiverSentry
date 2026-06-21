import { knex } from './knex';

const SAMPLE_WAIVERS = [
  { exception_id: "EXC-001", type: "admin_access", requester: "john.doe", approver: "alice.smith", justification: "Production troubleshooting", start_date: "2026-02-15", end_date: "2026-04-15", status: "ACTIVE", risk_level: "HIGH", renewal_count: 0 },
  { exception_id: "EXC-002", type: "firewall_rule_open", requester: "ops.team", approver: "bob.jones", justification: "Integration with Partner Ltd", start_date: "2025-11-20", end_date: "2026-04-20", status: "ACTIVE", risk_level: "MEDIUM", renewal_count: 0 },
  { exception_id: "EXC-003", type: "encryption_waiver", requester: "dev.lead", approver: "security.lead", justification: "Legacy system compatibility", start_date: "2023-06-01", end_date: "2024-06-01", status: "EXPIRED", risk_level: "HIGH", renewal_count: 0 },
  { exception_id: "EXC-00145", type: "admin_access", requester: "bob.dylan", approver: "sam.sepiol", justification: "Temporary", start_date: "2025-10-15", end_date: "2025-12-15", status: "ACTIVE", risk_level: "HIGH", renewal_count: 0 },
];

function generateManyRecords() {
  const records = [...SAMPLE_WAIVERS];
  const types = ['admin_access', 'firewall_rule_open', 'encryption_waiver', 'data_access', 'dev_environment'];
  const statuses = ['ACTIVE', 'EXPIRED', 'PENDING', 'REVOKED', 'RENEWED'];
  const risks = ['HIGH', 'MEDIUM', 'LOW'];

  for (let i = 1; i <= 250; i++) {
    // Mostly low/medium, few high types
    let t = 'generic_access';
    let r = 'LOW';
    let s = 'ACTIVE';
    
    // Weighted types
    const pType = Math.random();
    if (pType < 0.1) t = 'admin_access'; // 10%
    else if (pType < 0.2) t = 'encryption_waiver'; // 10%
    else if (pType < 0.5) t = 'firewall_rule_open'; // 30%
    else if (pType < 0.7) t = 'dev_environment'; // 20%
    else t = 'generic_access'; // 30%

    // Weighted risk
    const pRisk = Math.random();
    if (pRisk < 0.1) r = 'HIGH'; // 10%
    else if (pRisk < 0.4) r = 'MEDIUM'; // 30%
    else r = 'LOW'; // 60%

    // Override risk if admin
    if (t === 'admin_access') r = 'HIGH';

    // Weighted status
    const pStatus = Math.random();
    if (pStatus < 0.7) s = 'ACTIVE';
    else if (pStatus < 0.8) s = 'PENDING';
    else if (pStatus < 0.9) s = 'EXPIRED';
    else s = 'REVOKED';
    
    // some dates
    const startObj = new Date(2023 + (i % 3), 1, 1);
    startObj.setDate(startObj.getDate() + i);
    const startStr = startObj.toISOString().split('T')[0];

    const endObj = new Date(startObj);
    endObj.setMonth(endObj.getMonth() + 6 + (i % 6));
    const endStr = endObj.toISOString().split('T')[0];

    records.push({
      exception_id: `EXC-GEN-${100 + i}`,
      type: t,
      requester: `user${i}@company.com`,
      approver: `manager${i % 10}@company.com`,
      justification: `Business need for ${t} related to project ${i}`,
      start_date: startStr,
      end_date: endStr,
      status: s,
      risk_level: r,
      renewal_count: i % 3,
    });
  }
  return records;
}

export async function seedDatabase() {
  const countRes = await knex('waivers').count('* as count');
  const count = Number(countRes[0].count);
  
  if (count === 0) {
    console.log('[DB Seed] Database empty, generating 150+ demo records...');
    const records = generateManyRecords();
    
    // Knex bulk insert with chunking to avoid sqlite limits
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      await knex('waivers').insert(records.slice(i, i + chunkSize));
    }
    
    console.log('[DB Seed] Successfully seeded database.');
  } else {
    console.log(`[DB Seed] Database already contains ${count} records. Skip seeding.`);
  }
}
