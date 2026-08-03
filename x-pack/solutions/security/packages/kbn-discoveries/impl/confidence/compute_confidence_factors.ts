/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfidenceFactor, DeterministicFactors, ParsedAlertFields } from './types';
import { splitMultiValue } from './parse_anonymized_alerts_csv';

/**
 * Canonical enterprise ATT&CK tactic order (kill-chain progression), by tactic
 * id. Used to score how far along the chain a bundle of alerts spans.
 */
const TACTIC_ORDER: readonly string[] = [
  'TA0043', // Reconnaissance
  'TA0042', // Resource Development
  'TA0001', // Initial Access
  'TA0002', // Execution
  'TA0003', // Persistence
  'TA0004', // Privilege Escalation
  'TA0005', // Defense Evasion
  'TA0006', // Credential Access
  'TA0007', // Discovery
  'TA0008', // Lateral Movement
  'TA0009', // Collection
  'TA0011', // Command and Control
  'TA0010', // Exfiltration
  'TA0040', // Impact
];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const maxSharedFraction = (rows: ParsedAlertFields[], field: string): number => {
  if (rows.length === 0) {
    return 0;
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[field];
    if (value != null && value.length > 0) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const max = counts.size > 0 ? Math.max(...counts.values()) : 0;
  return max / rows.length;
};

/**
 * Compute the deterministic confidence factors for a bundle of alerts (an
 * attack discovery's constituent alerts, or a set of related detection alerts).
 * Pure, in-memory, no ES/LLM call — these factors are the auditable prior handed
 * to the LLM synthesis (and the fallback score if the LLM is unavailable).
 *
 * @param alertRows parsed field-maps for the bundle's alerts.
 * @param alertCount the bundle's alert count for breadth (defaults to
 *   `alertRows.length`; a caller may pass a larger cited count, e.g. an attack
 *   discovery's `alert_ids.length`, even when some rows are unavailable).
 * @param mitreTacticNamesFallback tactic NAMES used only when the alerts carry
 *   no `threat.tactic.id` (e.g. an attack discovery's `mitre_attack_tactics`).
 */
export const computeConfidenceFactors = ({
  alertRows,
  alertCount = alertRows.length,
  mitreTacticNamesFallback,
}: {
  alertRows: ParsedAlertFields[];
  alertCount?: number;
  mitreTacticNamesFallback?: string[];
}): DeterministicFactors => {
  const rows = alertRows;
  const matchedAlertCount = rows.length;
  const factors: ConfidenceFactor[] = [];

  // --- Evidence breadth: distinct data types across the alerts ---
  const categories = new Set<string>();
  const datasets = new Set<string>();
  for (const row of rows) {
    splitMultiValue(row['event.category']).forEach((value) => categories.add(value));
    splitMultiValue(row['event.dataset']).forEach((value) => datasets.add(value));
  }
  const breadth = clamp01(
    ((categories.size + datasets.size) / 6) * 0.7 + Math.min(1, Math.log2(alertCount + 1) / 3) * 0.3
  );
  factors.push({
    assessment: `${categories.size} event categories, ${datasets.size} datasets across ${alertCount} alerts`,
    evidence: [...categories, ...datasets].join(', ') || undefined,
    name: 'evidence_breadth',
    weight: breadth,
  });

  // --- MITRE completeness: distinct tactics + techniques (technique-level) ---
  const tactics = new Set<string>();
  const techniques = new Set<string>();
  for (const row of rows) {
    splitMultiValue(row['threat.tactic.id']).forEach((value) => tactics.add(value));
    splitMultiValue(row['threat.technique.id']).forEach((value) => techniques.add(value));
  }
  // Fall back to the provided tactic NAMES when the alerts lack threat.* fields.
  const tacticCount = tactics.size > 0 ? tactics.size : mitreTacticNamesFallback?.length ?? 0;
  const mitre = clamp01(
    Math.min(1, tacticCount / 5) * 0.7 + Math.min(1, techniques.size / 4) * 0.3
  );
  factors.push({
    assessment: `${tacticCount} tactics, ${techniques.size} techniques`,
    evidence: [...tactics, ...techniques].join(', ') || undefined,
    name: 'mitre_completeness',
    weight: mitre,
  });

  // --- Chain coherence (structural): kill-chain progression + entity cohesion ---
  const stagePositions = [...tactics]
    .map((tactic) => TACTIC_ORDER.indexOf(tactic))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b);
  const progression =
    stagePositions.length > 1
      ? clamp01(
          (stagePositions[stagePositions.length - 1] - stagePositions[0]) /
            (TACTIC_ORDER.length - 1)
        )
      : 0;
  const entityCohesion = Math.max(
    maxSharedFraction(rows, 'host.name'),
    maxSharedFraction(rows, 'user.name')
  );
  const coherence = clamp01(progression * 0.55 + entityCohesion * 0.45);
  factors.push({
    assessment: `${
      stagePositions.length
    } kill-chain stages spanned, entity cohesion ${entityCohesion.toFixed(2)}`,
    name: 'chain_coherence_structural',
    weight: coherence,
  });

  // --- Counter-evidence (penalty): benign signals in the alerts ---
  let trustedSigned = 0;
  let benignDisposition = 0;
  for (const row of rows) {
    if ((row['process.code_signature.trusted'] ?? '').toLowerCase() === 'true') {
      trustedSigned += 1;
    }
    const severity = (row['kibana.alert.severity'] ?? '').toLowerCase();
    const status = (row['kibana.alert.workflow_status'] ?? '').toLowerCase();
    if (status === 'closed' || status === 'acknowledged' || severity === 'low') {
      benignDisposition += 1;
    }
  }
  const counterStrength =
    matchedAlertCount > 0
      ? clamp01((trustedSigned * 0.5 + benignDisposition) / matchedAlertCount)
      : 0;
  factors.push({
    assessment: `${trustedSigned}/${matchedAlertCount} trusted-signed, ${benignDisposition}/${matchedAlertCount} closed/low-severity`,
    name: 'counter_evidence',
    weight: -counterStrength,
  });

  const baseScore = clamp01(((breadth + mitre + coherence) / 3) * (1 - 0.5 * counterStrength));

  return { baseScore, counterStrength, factors, matchedAlertCount };
};

export const toBand = (score: number): 'high' | 'medium' | 'low' =>
  score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';
