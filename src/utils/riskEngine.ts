/**
 * Risk Scoring Engine for WaiverSentry
 * Mathematical & Explainable Cybersecurity Risk Assessment Model
 * SPDX-License-Identifier: Apache-2.0
 */

import { PolicyException, RiskEvaluationResult, ExceptionType, AccessLevel, BusinessCriticality } from '../types';

export const COMPENSATING_CONTROLS_REGISTRY = [
  { id: 'ip_whitelist', name: 'IP Whitelisting & CIDR Restriction', weight: 0.15, description: 'Limits access only to authorized corporate network footprints.' },
  { id: 'siem_alerting', name: 'SIEM High-Priority Alerts & Monitoring', weight: 0.10, description: 'Sends verbose logs directly to the Security Operations Center (SOC) with real-time alerting.' },
  { id: 'dual_auth', name: 'M-of-N Approval & Dual-Command Execution', weight: 0.20, description: 'Requires dual authorization and peer witness for any action undertaken under this waiver.' },
  { id: 'daily_review', name: 'Automated 24h Log Escalation & Audit', weight: 0.15, description: 'Conducts daily scripts that parse and report all actions taken without human delay.' },
  { id: 'jit_isolation', name: 'Session Token Throttling & Sandboxing', weight: 0.10, description: 'Limits session credentials to single-use 15-minute bursts or places action inside a restricted sandbox environment.' }
];

export function calculateWaiverRisk(exception: Partial<PolicyException>): RiskEvaluationResult {
  // 1. Identify Base Risk based on Exception Type (on a 10 point scale)
  let baseScore = 5.0;
  const exceptionType = exception.type || 'other';
  switch (exceptionType) {
    case 'mfa_bypass':
      baseScore = 9.5; // Instant high asset impact
      break;
    case 'admin_privilege':
      baseScore = 9.0; // High lateral movement risk
      break;
    case 'third_party_access':
      baseScore = 8.5; // Extended supply-chain risk
      break;
    case 'firewall_rule':
      baseScore = 8.0; // Direct external egress mapping
      break;
    case 'password_policy':
      baseScore = 7.0; // Brute force danger
      break;
    case 'other':
      baseScore = 5.0;
      break;
  }

  // 2. Access Level Multiplier
  let accessMultiplier = 1.0;
  const accessLevel = exception.accessLevel || 'regular_user';
  switch (accessLevel) {
    case 'super_admin':
      accessMultiplier = 1.5;
      break;
    case 'service_account':
      accessMultiplier = 1.3;
      break;
    case 'regular_user':
      accessMultiplier = 1.0;
      break;
    case 'read_only':
      accessMultiplier = 0.7;
      break;
  }

  // 3. Business Criticality Multiplier
  let criticalityMultiplier = 1.0;
  const criticality = exception.businessCriticality || 'medium';
  switch (criticality) {
    case 'critical':
      criticalityMultiplier = 1.6;
      break;
    case 'high':
      criticalityMultiplier = 1.3;
      break;
    case 'medium':
      criticalityMultiplier = 1.0;
      break;
    case 'low':
      criticalityMultiplier = 0.6;
      break;
  }

  // 4. Calculate Duration in Days and Penalty
  let durationInDays = 30;
  if (exception.createdAt && exception.expiresAt) {
    const start = new Date(exception.createdAt).getTime();
    const end = new Date(exception.expiresAt).getTime();
    const diff = end - start;
    if (diff > 0) {
      durationInDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  let durationPenalty = 1.0;
  if (durationInDays <= 7) {
    durationPenalty = 0.8; // Tactical, fast fix
  } else if (durationInDays <= 30) {
    durationPenalty = 1.0; // Micro-exposure
  } else if (durationInDays <= 90) {
    durationPenalty = 1.25; // Significant duration
  } else {
    durationPenalty = 1.5; // Long term risk liability
  }

  // 5. Compensating Controls Discount
  let totalDiscount = 0;
  const activeControlIds = exception.compensatingControls || [];
  activeControlIds.forEach(id => {
    const control = COMPENSATING_CONTROLS_REGISTRY.find(c => c.id === id);
    if (control) {
      totalDiscount += control.weight;
    }
  });

  // Cap discount at 60% standard mitigation safety limit
  const cappedDiscount = Math.min(0.60, totalDiscount);
  const discountFactor = 1.0 - cappedDiscount;

  // 6. Mathematical Formula core product (scale to 0-100)
  // we do Base Risk * Access * Criticality * Duration * Discount * 5.5 to scale it appropriately
  const processedBase = baseScore * 5.5; // maps 9.5 to 52.25
  const formulaRisk = processedBase * accessMultiplier * criticalityMultiplier * durationPenalty * discountFactor;

  // 7. Additive Operational Penalties
  let operationalPenalties = 0;
  
  // Check if justification quality is sub-par (heuristics)
  const justificationScore = exception.justificationScore !== undefined ? exception.justificationScore : 5;
  if (justificationScore < 4) {
    operationalPenalties += 12; // Weak corporate accountability
  }

  // Check if status indicates neglected reviews or expired
  if (exception.status === 'expired') {
    operationalPenalties += 20; // High hazard target
  }
  if (exception.status === 'under_review' && exception.lastReviewedAt === null) {
    operationalPenalties += 10; // Left drift
  }

  // 8. Aggregate Score & Capping [0, 100]
  const finalScore = Math.min(100, Math.max(0, Math.round(formulaRisk + operationalPenalties)));

  // Determine Category
  let riskCategory: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (finalScore >= 80) {
    riskCategory = 'critical';
  } else if (finalScore >= 60) {
    riskCategory = 'high';
  } else if (finalScore >= 35) {
    riskCategory = 'medium';
  }

  // Generate explainable textual summary
  const controlCount = activeControlIds.length;
  let explanation = `The risk score is calculated at ${finalScore}/100 [${riskCategory.toUpperCase()}]. `;
  explanation += `Base vulnerability score for exception type is ${(baseScore * 5.5).toFixed(1)} points. `;
  explanation += `This base score is multiplied by ${accessMultiplier.toFixed(1)}x for ${accessLevel} privileges, `;
  explanation += `${criticalityMultiplier.toFixed(1)}x based on targeting a ${criticality} criticality asset, `;
  explanation += `and ${durationPenalty.toFixed(1)}x because it remains exposed for ${durationInDays} days. `;
  
  if (cappedDiscount > 0) {
    explanation += `Mitigation discount of ${(cappedDiscount * 100).toFixed(0)}% was successfully subtracted due to ${controlCount} active security controls. `;
  } else {
    explanation += `No compensating controls are mapped, which fails to reduce risk. `;
  }

  if (operationalPenalties > 0) {
    explanation += `An operational penalty of +${operationalPenalties} points was added due to regulatory context (e.g. neglected review, weak justification or expired state).`;
  }

  // Recommended actions based on category
  const recommendedActions: string[] = [];
  switch (riskCategory) {
    case 'critical':
      recommendedActions.push('CRITICAL: Page-out the CISO and Asset Security Owner immediately.');
      recommendedActions.push('Require multi-level board approval (e.g. CISO + CTO) within 24 hours or schedule automatic revocation.');
      recommendedActions.push('Apply immediate IP whitelisting restrictions and session throttling controls.');
      recommendedActions.push('Conduct daily log review or ingest logs directly into priority high SIEM telemetry.');
      break;
    case 'high':
      recommendedActions.push('Require CISO or Deputy CISO peer approval.');
      recommendedActions.push('Configure at least two compensating controls on the hosting machine.');
      recommendedActions.push('Mandate a manual renewal review every 14 days.');
      break;
    case 'medium':
      recommendedActions.push('Require direct department manager or VP product approval.');
      recommendedActions.push('Log all commands and sessions to an external vault.');
      recommendedActions.push('Schedule default expiration within 30 days.');
      break;
    case 'low':
      recommendedActions.push('Self-service approval path with logging activated.');
      recommendedActions.push('Standard review on quarterly rhythm.');
      break;
  }

  return {
    riskScore: finalScore,
    riskCategory,
    baseComponent: Math.round(processedBase),
    criticalityMultiplier,
    accessMultiplier,
    durationPenalty,
    discountFactor,
    operationalPenalties,
    explanation,
    recommendedActions
  };
}

export function mapToStandards(type: ExceptionType): string[] {
  switch (type) {
    case 'mfa_bypass':
      return ['NIST SP 800-53 AC-2', 'NIST SP 800-53 PL-4', 'CIS Controls 1.1'];
    case 'firewall_rule':
      return ['NIST SP 800-53 AC-2', 'CIS Controls 1.1', 'GDPR Article 25'];
    case 'admin_privilege':
      return ['NIST SP 800-53 AC-2', 'NIST SP 800-53 PL-4', 'GDPR Article 25'];
    case 'password_policy':
      return ['NIST SP 800-53 AC-2', 'NIST SP 800-53 PL-4'];
    case 'third_party_access':
      return ['NIST SP 800-53 AC-2', 'GDPR Article 25', 'CIS Controls 1.1'];
    case 'other':
      return ['NIST SP 800-53 PL-4', 'GDPR Article 25'];
  }
}
