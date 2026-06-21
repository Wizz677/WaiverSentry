/**
 * Types and interfaces for WaiverSentry (Compliance Exception & Policy Waiver Manager)
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExceptionType =
  | 'mfa_bypass'
  | 'firewall_rule'
  | 'admin_privilege'
  | 'password_policy'
  | 'third_party_access'
  | 'other';

export type AccessLevel =
  | 'super_admin'
  | 'regular_user'
  | 'read_only'
  | 'service_account';

export type BusinessCriticality =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type WaiverStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'renewal_requested'
  | 're_approved'
  | 'expired'
  | 'revoked';

export interface CompensatingControl {
  id: string;
  name: string;
  weight: number; // reduction weight (e.g., 0.15 for 15% discount)
  description: string;
}

export interface WaiverHistoryItem {
  timestamp: string;
  action: string;
  user: string;
  notes: string;
}

export interface WaiverReview {
  reviewer: string;
  date: string;
  decision: 'approved' | 'rejected' | 'comment';
  notes: string;
}

export type AnomalyType = 
  | 'EXPIRED_ACTIVE_EXCEPTION'
  | 'CRITICAL_RISK_EXCEPTION'
  | 'LONG_RUNNING_EXCEPTION'
  | 'HIGH_RISK_LONG_EXCEPTION'
  | 'STALLED_REVIEW'
  | null;

export type ThreatStatus = 'ACTIVELY EXPLOITED' | 'known vulnerability' | 'none';

export interface PolicyException {
  id: string;
  title: string;
  description: string;
  type: ExceptionType;
  systemName: string;
  ownerName: string;
  ownerEmail: string;
  approver?: string;
  accessLevel: AccessLevel;
  businessCriticality: BusinessCriticality;
  createdAt: string;
  expiresAt: string;
  status: WaiverStatus;
  justification: string;
  justificationScore: number; // 0 to 10
  compensatingControls: string[]; // ids of pre-defined controls
  reviews: WaiverReview[];
  riskScore: number;
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  history: WaiverHistoryItem[];
  lastReviewedAt: string | null;
  complianceMappings: string[]; // list of standards (e.g. "NIST SP 800-53")
  anomaly?: AnomalyType; // Computed flag
  threatStatus?: ThreatStatus; // Computed flag
  cveId?: string; // CVE reference if applicable
  cveBaseScore?: number; // CVSS multiplier
  ciaImpact?: {
    confidentiality: 'low' | 'moderate' | 'high';
    integrity: 'low' | 'moderate' | 'high';
    availability: 'low' | 'moderate' | 'high';
  };
}

export interface RiskEvaluationResult {
  riskScore: number;
  riskCategory: 'low' | 'medium' | 'high' | 'critical';
  baseComponent: number;
  criticalityMultiplier: number;
  accessMultiplier: number;
  durationPenalty: number;
  discountFactor: number;
  operationalPenalties: number;
  explanation: string;
  recommendedActions: string[];
}
