/**
 * Realistic Preloaded Cybersecurity Exceptions & Policy Waivers
 * SPDX-License-Identifier: Apache-2.0
 */

import { PolicyException } from '../types';
import { calculateWaiverRisk, mapToStandards } from '../utils/riskEngine';

// Helper to calculate preloaded values with computed risks
function createWaiver(waiver: Omit<PolicyException, 'riskScore' | 'riskCategory' | 'complianceMappings'>): PolicyException {
  const calculated = calculateWaiverRisk(waiver as Partial<PolicyException>);
  const standards = mapToStandards(waiver.type);
  return {
    ...waiver,
    riskScore: calculated.riskScore,
    riskCategory: calculated.riskCategory,
    complianceMappings: standards
  };
}

export const PRELOADED_WAIVERS: PolicyException[] = [
  createWaiver({
    id: 'WVR-2026-0041',
    title: 'Temporary MFA Bypass for Automated Jenkins Build Server Service Account',
    description: 'Jenkins executor agent on server region US-EAST lacks hardware security token capability. An exception is required to bypass multi-factor authentication requirements for automated pipeline execution.',
    type: 'mfa_bypass',
    systemName: 'CI/CD Pipeline Core - Production East Jenkins',
    ownerName: 'Sarah Jenkins',
    ownerEmail: 'sarah.j@company-secure.com',
    accessLevel: 'service_account',
    businessCriticality: 'critical',
    createdAt: '2026-06-01T08:00:00.000Z',
    expiresAt: '2026-07-01T08:00:00.000Z',
    status: 'active',
    justification: 'The build server agent performs fully headless scheduled integration compiles at midnight. Current company pipeline infrastructure does not support OIDC federation or hardware virtual tokens for headless executors. Legacy credentials must be used.',
    justificationScore: 7,
    compensatingControls: ['ip_whitelist', 'siem_alerting'],
    reviews: [
      {
        reviewer: 'Alex Carter (GRC Director)',
        date: '2026-06-01T14:30:00.000Z',
        decision: 'approved',
        notes: 'Approved for exactly 30 days pending standard architecture upgrade to AWS IAM Roles/OIDC. Jenkins server is bound strictly to static CIDR.'
      }
    ],
    history: [
      { timestamp: '2026-06-01T08:15:00.000Z', action: 'Requested', user: 'Sarah Jenkins', notes: 'Exception created in system registry' },
      { timestamp: '2026-06-01T14:30:00.000Z', action: 'Approved', user: 'Alex Carter', notes: 'Granted with whitelisting and SIEM alerts active' }
    ],
    lastReviewedAt: '2026-06-01T14:30:00.000Z'
  }),

  createWaiver({
    id: 'WVR-2026-0038',
    title: 'Firewall Inbound Rule Exception for Offshore Partner Security Audit',
    description: 'External security auditor offshore team needs access to internal staging CRM. Direct port 443 mapping required from audited team network block dynamically.',
    type: 'firewall_rule',
    systemName: 'Staging CRM Environment (SAP ERP Backend Connected)',
    ownerName: 'Marcus Vance',
    ownerEmail: 'marcus.v@company-secure.com',
    accessLevel: 'regular_user',
    businessCriticality: 'high',
    createdAt: '2026-05-15T10:00:00.000Z',
    expiresAt: '2026-06-15T10:00:00.000Z',
    status: 'expired',
    justification: 'Vendor performs certified penetration test against ERP endpoints. Staging environment does not permit external IPSec VPN clients for external contractors. Direct port opening is requested to expedite the audit timeline.',
    justificationScore: 3, // Poor reasoning - bypassing VPN is risky
    compensatingControls: ['ip_whitelist'],
    reviews: [
      {
        reviewer: 'Dave Chen (Security Lead)',
        date: '2026-05-15T11:00:00.000Z',
        decision: 'approved',
        notes: 'Approved pending 30 days maximum. Strictly constrained to external Auditor corporate headquarter CIDR.'
      }
    ],
    history: [
      { timestamp: '2026-05-15T10:05:00.000Z', action: 'Requested', user: 'Marcus Vance', notes: 'Created to support rapid pentest schedule' },
      { timestamp: '2026-05-15T11:00:00.000Z', action: 'Approved', user: 'Dave Chen', notes: 'Approved with limited IP scope' },
      { timestamp: '2026-06-15T10:00:00.000Z', action: 'Expired', user: 'System daemon', notes: 'Waiver past expiration date. Remediation alerts dispatched.' }
    ],
    lastReviewedAt: '2026-05-15T11:00:00.000Z'
  }),

  createWaiver({
    id: 'WVR-2026-0044',
    title: 'Temporary Domain Admin Privileges for Database Recovery',
    description: 'During emergency database sector corruption recovery, Senior DBA requires domain administrator level privileges to restore primary domain schema indices.',
    type: 'admin_privilege',
    systemName: 'Domain Controllers Core Active Directory & Primary DB Vault',
    ownerName: 'Robert Vance',
    ownerEmail: 'robert.v@company-secure.com',
    accessLevel: 'super_admin',
    businessCriticality: 'critical',
    createdAt: '2026-06-18T06:00:00.000Z',
    expiresAt: '2026-06-21T06:00:00.000Z',
    status: 'active',
    justification: 'Active directory backup synchronization failed during physical sector repair. Standard restricted DBA operations credentials do not possess write permissions to rebuild the system structural catalog tables.',
    justificationScore: 9, // Strong justification - critical outage
    compensatingControls: ['dual_auth', 'siem_alerting', 'daily_review'],
    reviews: [
      {
        reviewer: 'Elena Rostova (CISO)',
        date: '2026-06-18T06:15:00.000Z',
        decision: 'approved',
        notes: 'CRITICAL EMERGENCY OPERATIONS. Approved for exactly 72 hours. All actions must be co-witnessed by Security Operations Lead and SIEM priority configured.'
      }
    ],
    history: [
      { timestamp: '2026-06-18T06:01:00.000Z', action: 'Requested', user: 'Robert Vance', notes: 'Emergency database corruption escalation' },
      { timestamp: '2026-06-18T06:15:00.000Z', action: 'Approved', user: 'Elena Rostova', notes: 'Approved for urgent 72-hour window.' }
    ],
    lastReviewedAt: '2026-06-18T06:15:00.000Z'
  }),

  createWaiver({
    id: 'WVR-2026-0022',
    title: 'Password Endpoint Lock Exception for AS400 Legacy Integration API',
    description: 'Bypass internal password complexity, rotation rules, and lock-out algorithms for legacy COBOL client endpoints to complete nightly billing batch synchronization.',
    type: 'password_policy',
    systemName: 'Core Accounting AS400 Financial Database',
    ownerName: 'Frankie Miller',
    ownerEmail: 'frankie.m@company-secure.com',
    accessLevel: 'service_account',
    businessCriticality: 'high',
    createdAt: '2026-01-10T12:00:00.000Z',
    expiresAt: '2026-12-31T12:00:00.000Z',
    status: 'active',
    justification: 'The legacy physical terminal compiler crashes when receiving string inputs longer than 12 characters, and fails to process special characters like ! or / in credential sequences. Changing the core application would require 18 months and $240K specialized vendor rewrites.',
    justificationScore: 8, // Logical budget constraint validation
    compensatingControls: ['ip_whitelist', 'siem_alerting', 'jit_isolation'],
    reviews: [
      {
        reviewer: 'Alex Carter (GRC Director)',
        date: '2026-01-12T09:00:00.000Z',
        decision: 'approved',
        notes: 'Standard permanent operational liability waiver active. Compensated with intensive isolated networking, static CIDR gatekeeping, and throttling.'
      }
    ],
    history: [
      { timestamp: '2026-01-10T12:12:00.000Z', action: 'Requested', user: 'Frankie Miller', notes: 'Exception submitted with vendor documentation' },
      { timestamp: '2026-01-12T09:00:00.000Z', action: 'Approved', user: 'Alex Carter', notes: 'Permanent registration established with controls active' }
    ],
    lastReviewedAt: '2026-01-12T09:00:00.000Z'
  }),

  createWaiver({
    id: 'WVR-2026-0045',
    title: 'External SSH Access on Senior Engineer Sandbox VM',
    description: 'Direct insecure port 22 access enabled for personal corporate home address to permit rapid off-hours troubleshooting outside active corporate pulse client subnet.',
    type: 'firewall_rule',
    systemName: 'Pre-Prod Sandbox Deployment VM - Host 9021',
    ownerName: 'Johnathan Cole',
    ownerEmail: 'johnathan.c@company-secure.com',
    accessLevel: 'super_admin',
    businessCriticality: 'low',
    createdAt: '2026-06-19T02:00:00.000Z',
    expiresAt: '2026-07-19T02:00:00.000Z',
    status: 'revoked',
    justification: 'Pulsesecure client fails to authenticate from certain residential fiber nodes due to proxy issues. Engineer needs direct console access to correct staging cluster builds.',
    justificationScore: 2, // Violates basic VPN policy for home convenience
    compensatingControls: [],
    reviews: [
      {
        reviewer: 'Dave Chen (Security Lead)',
        date: '2026-06-19T05:00:00.000Z',
        decision: 'rejected',
        notes: 'Waiver rejected and access revoked immediately. Direct port 22 opening is entirely unsafe and violates corporate perimeter defensive protocols. Home residential fiber troubleshooting must routing through the approved secure engineering jump host gateway.'
      }
    ],
    history: [
      { timestamp: '2026-06-19T02:15:00.000Z', action: 'Requested', user: 'Johnathan Cole', notes: 'Submitted waiver request' },
      { timestamp: '2026-06-19T05:00:00.000Z', action: 'Revoked', user: 'Dave Chen', notes: 'Mandatory bypass blockade triggered. Access decommissioned and firewall rule removed.' }
    ],
    lastReviewedAt: '2026-06-19T05:00:00.000Z'
  }),

  createWaiver({
    id: 'WVR-2026-0046',
    title: 'Database Read-Only Privilege Delegation for External Auditor Agency',
    description: 'Provide temporary read-only database connectivity to external accounting auditors (Grant & Thornton Team) to confirm ledger integrity reports for fiscal consolidation.',
    type: 'third_party_access',
    systemName: 'Primary Treasury Transaction Vault DB',
    ownerName: 'Samantha Green',
    ownerEmail: 'samantha.g@company-secure.com',
    accessLevel: 'read_only',
    businessCriticality: 'high',
    createdAt: '2026-06-19T08:10:00.000Z',
    expiresAt: '2026-06-26T08:10:00.000Z',
    status: 'pending',
    justification: 'External audit requests direct SQL validation on ledgers to prevent management override manipulation representation. The audit scope requires matching physical ledgers against internal automated system ledgers within 7 days.',
    justificationScore: 9,
    compensatingControls: ['siem_alerting', 'jit_isolation'],
    reviews: [],
    history: [
      { timestamp: '2026-06-19T08:11:00.000Z', action: 'Requested', user: 'Samantha Green', notes: 'Submitted for GRC review audit cycle' }
    ],
    lastReviewedAt: null
  })
];
