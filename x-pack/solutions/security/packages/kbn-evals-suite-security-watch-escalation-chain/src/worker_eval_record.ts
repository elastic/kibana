/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shape validation for the durable `WorkerEvaluationRecord` this suite reads
 * back from `pnd-worker-evaluations`.
 *
 * The live gate used to inline a presence check:
 *
 *     typeof record.verdict === 'string' &&
 *     typeof record.confidence === 'number' &&
 *     record.watch === 'watch-floor' &&
 *     record.provenance != null &&
 *     record.evidenceRefs != null
 *
 * which accepts an empty `verdict`, `NaN` confidence, and `provenance: false` /
 * `evidenceRefs: false`, so a malformed stored record satisfied the
 * durable-outcome gate. The predicate lives here instead of in the spec so it can
 * be unit-tested (`worker_eval_record.test.ts`) — a gate whose only caller is a
 * live spec cannot be pinned by a test.
 */

export const WORKER_EVAL_RECORD_FIELDS = [
  'verdict',
  'confidence',
  'watch',
  'provenance',
  'evidenceRefs',
] as const;

const isNonEmptyString = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

/** `NaN` and `Infinity` are numbers, and neither is a usable confidence. */
const isConfidence = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/** Provenance is a reference: a non-empty object or a non-empty string. */
const isProvenance = (value: unknown): boolean => {
  if (isNonEmptyString(value)) return true;
  return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
};

/** Evidence references are usable only when each one names something. */
const isEvidenceRefs = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);

const fieldIsValid = (field: string, value: unknown): boolean => {
  switch (field) {
    case 'verdict':
    case 'watch':
      return isNonEmptyString(value);
    case 'confidence':
      return isConfidence(value);
    case 'provenance':
      return isProvenance(value);
    case 'evidenceRefs':
      return isEvidenceRefs(value);
    default:
      return value !== undefined && value !== null;
  }
};

export const hasWorkerEvalRecordShape = (doc: Record<string, unknown>): boolean =>
  WORKER_EVAL_RECORD_FIELDS.every((field) => fieldIsValid(field, doc[field]));

export const invalidWorkerEvalRecordFields = (doc: Record<string, unknown>): string[] =>
  WORKER_EVAL_RECORD_FIELDS.filter((field) => !fieldIsValid(field, doc[field]));
