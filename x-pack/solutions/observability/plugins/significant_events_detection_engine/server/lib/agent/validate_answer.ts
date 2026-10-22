/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENGINE_SEVERITIES, EVIDENCE_VERDICTS, type EngineSeverity } from '../../../common';
import type { AgentAnswer, AgentCase } from './types';

export type ValidationResult =
  | { ok: true; answer: AgentAnswer; corrections: string[] }
  | { ok: false; reason: string };

/**
 * Checks an agent answer against its case. Structure and citations are checked; whether the
 * reasoning is right is not, which is what labelled cases and people are for.
 */
export function validateAnswer(agentCase: AgentCase, answer: AgentAnswer): ValidationResult {
  if (!ENGINE_SEVERITIES.includes(answer.severity)) {
    return { ok: false, reason: `unknown severity "${answer.severity}"` };
  }
  if (!answer.title?.trim() || !answer.summary?.trim()) {
    return { ok: false, reason: 'missing title or summary' };
  }

  const evidenceById = new Map(agentCase.evidence.map((evidence) => [evidence.id, evidence]));
  const unknownCitation = answer.verdicts.find((verdict) => !evidenceById.has(verdict.evidence_id));
  if (unknownCitation) {
    return {
      ok: false,
      reason: `cites evidence "${unknownCitation.evidence_id}" that the case does not hold`,
    };
  }
  const badVerdict = answer.verdicts.find(
    (verdict) => !EVIDENCE_VERDICTS.includes(verdict.verdict)
  );
  if (badVerdict) {
    return { ok: false, reason: `unknown verdict "${badVerdict.verdict}"` };
  }

  const corrections: string[] = [];

  // A verdict that the evidence cannot support is corrected, not trusted.
  const verdicts = answer.verdicts.map((verdict) => {
    const evidence = evidenceById.get(verdict.evidence_id)!;
    if (
      (verdict.verdict === 'confirms' || verdict.verdict === 'off_topic') &&
      evidence.result !== 'found'
    ) {
      corrections.push(
        `${verdict.evidence_id}: "${verdict.verdict}" needs rows, the query returned ${evidence.result}; recorded as inconclusive`
      );
      return { ...verdict, verdict: 'inconclusive' as const };
    }
    return verdict;
  });

  // Evidence the agent skipped is recorded as inconclusive, so every item has a verdict.
  const answered = new Set(verdicts.map((verdict) => verdict.evidence_id));
  const missing = agentCase.evidence
    .filter((evidence) => !answered.has(evidence.id))
    .map((evidence) => ({
      evidence_id: evidence.id,
      verdict: 'inconclusive' as const,
      note: 'The agent gave no verdict for this evidence.',
    }));
  if (missing.length > 0) {
    corrections.push(
      `${missing.length} evidence item(s) without a verdict recorded as inconclusive`
    );
  }

  return {
    ok: true,
    answer: {
      ...answer,
      verdicts: [...verdicts, ...missing],
    },
    corrections,
  };
}

const SEVERITY_RANK: Record<EngineSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

/**
 * Guards on the agent's severity. Severity stays the agent's judgment; code only stops it from
 * outrunning the evidence.
 */
export function guardSeverity({
  severity,
  confirmations,
  hasCustomerAlert,
}: {
  severity: EngineSeverity;
  confirmations: number;
  hasCustomerAlert: boolean;
}): { severity: EngineSeverity; guard?: string } {
  if (severity === 'critical' && confirmations < 2 && !hasCustomerAlert) {
    return {
      severity: 'high',
      guard:
        'Critical needs two confirming pieces of evidence or a firing customer alert; capped at high.',
    };
  }
  if (confirmations === 0 && SEVERITY_RANK[severity] > SEVERITY_RANK.medium) {
    return {
      severity: 'medium',
      guard: 'No evidence confirmed the problem; capped at medium.',
    };
  }
  return { severity };
}
