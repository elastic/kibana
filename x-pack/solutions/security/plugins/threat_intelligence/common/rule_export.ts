/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityLevel } from './constants';

/**
 * ES|QL rule export for behaviors extracted by `hunt_behavior`. The Elastic
 * Detection Engine handoff is the canonical durable output (Layer 2 in the
 * three-layer model); the generated query is a starting point that needs
 * human refinement against the customer's actual index pattern + ECS field
 * schema before enabling.
 *
 * This helper is pure and lives in `common/` so it can be unit-tested
 * without spinning up the agent runtime.
 */

export interface BehaviorExport {
  technique_id: string;
  technique_name: string;
  parent_technique_id?: string;
  tactic_ids: readonly string[];
  evidence_quote: string;
  confidence: number;
  severity?: SeverityLevel;
  report_id?: string;
}

/**
 * Detection-Engine risk score mapping used by both `proposedEsqlRule` (for
 * the in-file rule comment) and `hunt_behavior` (to enrich the per-behavior
 * `attachment_hint` so the renderer doesn't have to recompute it).
 */
export const severityToRiskScore = (severity: SeverityLevel | undefined): number => {
  switch (severity) {
    case 'critical':
      return 90;
    case 'high':
      return 73;
    case 'medium':
      return 47;
    case 'low':
    default:
      return 21;
  }
};

/**
 * Default severity inferred from LLM confidence. This is intentionally
 * coarse — the analyst can override on the finding card or on the rule
 * create page. The boundaries match the LLM-threshold gate
 * (`hunt_behavior` drops <0.5 candidates) so the lowest bucket is "low".
 */
export const severityFromConfidence = (confidence: number): SeverityLevel => {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  return 'low';
};

export const sanitizeRuleName = (
  techniqueId: string,
  techniqueName: string,
  reportId?: string
): string => {
  const base = `${techniqueId}: ${techniqueName}`;
  return reportId ? `${base} (${reportId.slice(0, 12)})` : base;
};

/**
 * Skeleton ES|QL detection. The actual query needs human refinement against
 * the customer's index pattern + field schema — we deliberately scope to the
 * common Elastic ECS event index pattern and emit a parameterized search so
 * the rule fires on raw evidence quotes from the report. Tunes follow.
 */
export const proposedEsqlRule = (b: BehaviorExport): string => {
  const ruleName = sanitizeRuleName(b.technique_id, b.technique_name, b.report_id);
  const severity = b.severity ?? 'medium';
  return [
    `// Generated from threat_intel.hunt_behavior — refine the FROM clause and the`,
    `// WHERE predicate against the customer's actual ECS field schema before enabling.`,
    `// rule_name: ${ruleName}`,
    `// severity: ${severity}  risk_score: ${severityToRiskScore(severity)}`,
    `// mitre_attack: ${b.technique_id}${
      b.parent_technique_id ? ` (parent ${b.parent_technique_id})` : ''
    }`,
    `// tactics: ${b.tactic_ids.join(', ') || '<unmapped>'}`,
    `FROM logs-*,traces-*`,
    `| WHERE event.action IS NOT NULL`,
    `| WHERE TO_LOWER(message) LIKE "*${b.technique_name.toLowerCase()}*"`,
    `| KEEP @timestamp, host.name, user.name, process.name, event.action, message`,
    `| LIMIT 100`,
  ].join('\n');
};
