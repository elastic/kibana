/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Risk-score helpers
//
// These mirror the logic in security_solution:
//   - getRiskLevel    → security_solution/common/entity_analytics/risk_engine/risk_levels.ts
//   - getRiskScoreColors → security_solution/.../entities_table/risk_score_cell.tsx
//
// We cannot import from there directly because `security_solution` is a
// `visibility: private` plugin and this package is a separate module —
// crossing that boundary is forbidden by Kibana's module-boundary rules
// (enforced by ESLint). If those thresholds or color tokens ever change,
// update this copy too.
// ---------------------------------------------------------------------------

import type { EuiThemeComputed } from '@elastic/eui';

/** Risk severity levels, ordered ascending. */
export type RiskLevel = 'Unknown' | 'Low' | 'Moderate' | 'High' | 'Critical';

/** Bucket a numeric risk score into a severity level. Thresholds match Entity Analytics. */
export const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 90) return 'Critical';
  if (score >= 70) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Unknown';
};

/** Semantic EUI color tokens per risk level — identical to getRiskScoreColors in entity analytics. */
export const getRiskScoreColors = (
  euiTheme: EuiThemeComputed,
  level: RiskLevel
): { background: string; text: string } => {
  switch (level) {
    case 'Critical':
      return {
        background: euiTheme.colors.backgroundLightDanger,
        text: euiTheme.colors.textDanger,
      };
    case 'High':
      return {
        background: euiTheme.colors.backgroundLightRisk,
        text: euiTheme.colors.textRisk,
      };
    case 'Moderate':
      return {
        background: euiTheme.colors.backgroundLightWarning,
        text: euiTheme.colors.textWarning,
      };
    case 'Low':
      return {
        background: euiTheme.colors.backgroundBaseNeutral,
        text: euiTheme.colors.textNeutral,
      };
    default:
      return {
        background: euiTheme.colors.backgroundBaseSubdued,
        text: euiTheme.colors.textSubdued,
      };
  }
};
