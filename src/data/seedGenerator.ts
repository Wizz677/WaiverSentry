import { PolicyException, ExceptionType, AccessLevel, BusinessCriticality, WaiverStatus, AnomalyType } from '../types';
import { calculateWaiverRisk, mapToStandards } from '../utils/riskEngine';

export const EVALUATION_DATE = '2026-06-20T12:00:00.000Z';
const EVAL_MS = new Date(EVALUATION_DATE).getTime();

const KEV_SYSTEMS = [
  'Atlassian Confluence',
  'Ivanti Sentry',
  'Cisco SD-WAN Manager',
  'Splunk',
  'Oracle PeopleSoft',
  'Fortinet FortiOS'
];

const NON_KEV_SYSTEMS = [
  'Internal HR Portal',
  'Legacy SAP Gateway',
  'Test Database Cluster',
  'Customer Support CRM',
  'Analytics Hadoop Node'
];

const OWNERS = [
  { name: 'Sarah Jenkins', email: 'sarah.j@company-secure.com' },
  { name: 'Marcus Vance', email: 'marcus.v@company-secure.com' },
  { name: 'Robert Vance', email: 'robert.v@company-secure.com' },
  { name: 'Frankie Miller', email: 'frankie.m@company-secure.com' },
  { name: 'Johnathan Cole', email: 'johnathan.c@company-secure.com' },
  { name: 'Samantha Green', email: 'samantha.g@company-secure.com' }
];

const REVIEWERS = [
  'Alex Carter (GRC Director)',
  'Dave Chen (Security Lead)',
  'Elena Rostova (CISO)'
];

const EXCEPTION_TYPES: ExceptionType[] = [
  'mfa_bypass', 'firewall_rule', 'admin_privilege', 'password_policy', 'third_party_access', 'other'
];

const ACCESS_LEVELS: AccessLevel[] = [
  'super_admin', 'regular_user', 'read_only', 'service_account'
];

const CRITICALITIES: BusinessCriticality[] = [
  'low', 'medium', 'high', 'critical'
];

export function runAnomalyEngine(waiver: PolicyException): AnomalyType {
  const expiresMs = new Date(waiver.expiresAt).getTime();
  const createdMs = new Date(waiver.createdAt).getTime();
  const activeDurationDays = (EVAL_MS - createdMs) / (1000 * 60 * 60 * 24);
  const pendingReviewDays = waiver.lastReviewedAt ? (EVAL_MS - new Date(waiver.lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24) : activeDurationDays;

  if (waiver.status === 'active' && expiresMs < EVAL_MS) {
    return 'EXPIRED_ACTIVE_EXCEPTION';
  }
  
  if (waiver.riskCategory === 'critical' && waiver.status === 'under_review') {
    return 'CRITICAL_RISK_EXCEPTION';
  }
  
  if (waiver.status === 'active' && activeDurationDays > 180) {
    return 'LONG_RUNNING_EXCEPTION';
  }
  
  if (waiver.status === 'active' && (waiver.riskCategory === 'high' || waiver.riskCategory === 'critical') && pendingReviewDays > 90) {
    return 'HIGH_RISK_LONG_EXCEPTION';
  }
  
  if (waiver.status === 'pending' && pendingReviewDays > 30) {
    return 'STALLED_REVIEW';
  }
  
  return null;
}

function generateSyntheticWaivers(count: number): PolicyException[] {
  const waivers: PolicyException[] = [];
  
  let seed = 12345;
  function prng() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  function choice<T>(arr: T[]): T {
    return arr[Math.floor(prng() * arr.length)];
  }

  for (let i = 0; i < count; i++) {
    const id = `WVR-2026-${String(i + 100).padStart(4, '0')}`;
    const type = choice(EXCEPTION_TYPES);
    const owner = choice(OWNERS);
    
    const isKev = prng() > 0.7; // 30% KEV
    const systemName = choice(isKev ? KEV_SYSTEMS : NON_KEV_SYSTEMS) + ' ' + choice(['Prod', 'Staging', 'Dev']);
    
    const accessLevel = choice(ACCESS_LEVELS);
    const businessCriticality = choice(CRITICALITIES);
    
    const daysOffset = Math.floor(prng() * 365) - 200; // -200 to +165 days created from eval
    const createdMs = EVAL_MS + (daysOffset * 86400 * 1000); // Past
    
    const durationDays = choice([7, 14, 30, 90, 180]);
    let expiresMs = createdMs + (durationDays * 86400 * 1000);
    
    let status: WaiverStatus = choice(['active', 'active', 'pending', 'under_review', 'expired', 'revoked']);
    
    // Force anomalies:
    const anomalyRoll = prng();
    // EXPIRED_ACTIVE_EXCEPTION (~10%)
    if (anomalyRoll < 0.10) {
      status = 'active';
      expiresMs = EVAL_MS - (Math.floor(prng() * 30) + 1) * 86400 * 1000;
    }
    // CRITICAL_RISK_EXCEPTION (~5%)
    else if (anomalyRoll < 0.15) {
      status = 'under_review';
    } 
    // LONG_RUNNING_EXCEPTION (~10%)
    else if (anomalyRoll < 0.25) {
      status = 'active';
      expiresMs = EVAL_MS + 30 * 86400 * 1000;
    }
    // STALLED_REVIEW (~10%)
    else if (anomalyRoll < 0.35) {
      status = 'pending';
    }
    
    const createdAt = new Date(createdMs).toISOString();
    const expiresAt = new Date(expiresMs).toISOString();
    let lastReviewedAt = new Date(createdMs + 86400000).toISOString();
    
    if (status === 'pending' && anomalyRoll < 0.35) {
      lastReviewedAt = new Date(createdMs).toISOString(); // no review since creation
    }
    if (status === 'active' && anomalyRoll > 0.15 && anomalyRoll < 0.25) {
      lastReviewedAt = new Date(createdMs).toISOString(); // long running without renewal
    }
    
    const w: Partial<PolicyException> = {
      id,
      title: `${type.toUpperCase()} Exception for ${systemName}`,
      description: `Auto-generated synthetic exception for ${type}`,
      type,
      systemName,
      ownerName: owner.name,
      ownerEmail: owner.email,
      accessLevel,
      businessCriticality,
      createdAt,
      expiresAt,
      status,
      justification: 'Business continuity requires this operational waiver.',
      justificationScore: Math.floor(prng() * 6) + 4,
      compensatingControls: [],
      reviews: status === 'pending' ? [] : [{
        reviewer: choice(REVIEWERS),
        date: lastReviewedAt,
        decision: 'approved',
        notes: 'Automatically reviewed'
      }],
      history: [],
      lastReviewedAt: status === 'pending' ? null : lastReviewedAt,
    };
    
    // Force risk category for anomalies
    if (anomalyRoll >= 0.10 && anomalyRoll < 0.15) {
      w.businessCriticality = 'critical';
      w.accessLevel = 'super_admin';
    }
    
    const calculated = calculateWaiverRisk(w);
    const standards = mapToStandards(w.type as ExceptionType);
    
    let finalWaiver: PolicyException = {
      ...(w as PolicyException),
      riskScore: calculated.riskScore,
      riskCategory: calculated.riskCategory,
      complianceMappings: standards,
      ciaImpact: {
        confidentiality: choice(['low', 'moderate', 'high']),
        integrity: choice(['low', 'moderate', 'high']),
        availability: choice(['low', 'moderate', 'high'])
      }
    };
    
    finalWaiver.anomaly = runAnomalyEngine(finalWaiver);
    
    waivers.push(finalWaiver);
  }
  
  return waivers;
}

export const SYNTHETIC_WAIVERS: PolicyException[] = generateSyntheticWaivers(600);
