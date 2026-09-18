/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICES } from '../constants';

/**
 * L4 durable-outcome gate for the raw-log corroboration worker.
 *
 * The spec used to infer persistence from the RESPONSE TEXT: it set
 * `durableOutcomeVerified` when any response content contained "investigation",
 * "timeline" or "persisted". All three words are in the prompt, so the gate was
 * satisfied by echoing the request — an ephemeral or hallucinated report scored
 * as durable, and the `emit_corroboration` / `recordDeepWatch` tool-id probe
 * next to it could only ever report 0 because neither tool id exists in this
 * repository.
 *
 * This gate reads persisted state instead, and only counts a record that is
 * correlated to THIS run: the per-run id echoed through the request must appear
 * in the stored document, and the document must not predate the run.
 */

export interface ReadbackHit {
  _source?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DurableOutcomeEvaluation {
  /** Hits whose `@timestamp` is at/after the run started. */
  recentCount: number;
  /** Recent hits that carry this run's identifier. */
  correlatedCount: number;
  /** Correlated hits whose stored document carries non-empty structured findings. */
  structuredFindingsStored: boolean;
  success: boolean;
}

const documentOf = (hit: ReadbackHit): Record<string, unknown> =>
  (hit._source ?? (hit as Record<string, unknown>)) as Record<string, unknown>;

/**
 * The report contract's FINDING fields, in both spellings the worker uses.
 *
 * A persisted report is only evidence of a durable outcome when it carries
 * findings — a heading is not a finding.
 */
const FINDING_FIELDS: readonly string[] = [
  'corroboratedEvents',
  'corroborated_events',
  'gapEvents',
  'gap_events',
  'unresolvedQuestions',
  'unresolved_questions',
];

/**
 * True when the stored record carries non-empty STRUCTURED findings.
 *
 * Two weaker versions came before this one and both scored a non-answer as a
 * durable outcome:
 *   - matching the serialized document for the word "corroborat" accepted a
 *     document whose only content was `summary: "Corroboration report"`;
 *   - walking values under corroboration-shaped keys still accepted the same
 *     summary, because the prose itself contains the word.
 *
 * So the check is now structural: some finding field of the report contract has
 * to hold at least one entry. `summary: "Corroboration report for <runId>"` is
 * exactly the shape this rejects — the document proves the report was written,
 * not that any corroboration was recorded.
 */
const hasStructuredFindings = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some((entry) => hasStructuredFindings(entry));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
      if (FINDING_FIELDS.includes(key) && Array.isArray(entry) && entry.length > 0) return true;
      return hasStructuredFindings(entry);
    });
  }
  return false;
};

const timestampOf = (hit: ReadbackHit): number | undefined => {
  const doc = documentOf(hit);
  const raw = doc['@timestamp'] ?? doc.createdAt ?? doc.timestamp;
  if (typeof raw !== 'string') return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Search the Investigation timeline for documents written since the run began.
 *
 * Correlation is applied in `evaluateDurableOutcome` rather than in the query:
 * the run id can land in any nested field of the stored record (the worker
 * echoes it into the report it writes), and a `multi_match` over `*` fields is
 * both brittle and impossible to unit-test. The query bounds the window; the
 * gate does the identity check.
 */
export const buildInvestigationReadbackSearch = ({
  runStartedAt,
  size = 25,
}: {
  runStartedAt: string;
  size?: number;
}) => ({
  index: INDICES.INVESTIGATIONS,
  size,
  sort: [{ '@timestamp': 'desc' }],
  query: {
    bool: {
      filter: [{ range: { '@timestamp': { gte: runStartedAt } } }],
    },
  },
});

export const evaluateDurableOutcome = ({
  runId,
  runStartedAt,
  hits,
}: {
  runId: string;
  runStartedAt: string;
  hits: ReadbackHit[];
}): DurableOutcomeEvaluation => {
  const runStartedAtMs = Date.parse(runStartedAt);
  const hasValidRunStart = !Number.isNaN(runStartedAtMs);

  const recent = hits.filter((hit) => {
    const ts = timestampOf(hit);
    if (ts === undefined) return false; // no timestamp == cannot prove recency
    return !hasValidRunStart || ts >= runStartedAtMs;
  });

  const correlated = recent.filter((hit) => JSON.stringify(documentOf(hit)).includes(runId));

  const structuredFindingsStored = correlated.some((hit) => hasStructuredFindings(documentOf(hit)));

  return {
    recentCount: recent.length,
    correlatedCount: correlated.length,
    structuredFindingsStored,
    success: correlated.length > 0 && structuredFindingsStored,
  };
};
