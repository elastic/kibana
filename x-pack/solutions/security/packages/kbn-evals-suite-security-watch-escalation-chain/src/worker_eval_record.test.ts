/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WORKER_EVAL_RECORD_FIELDS,
  hasWorkerEvalRecordShape,
  invalidWorkerEvalRecordFields,
} from './worker_eval_record';

const VALID = {
  verdict: 'true_positive',
  confidence: 0.9,
  watch: 'watch-floor',
  provenance: { workflowExecutionId: 'exec-1' },
  evidenceRefs: ['evidence-1'],
};

const without = (field: string): Record<string, unknown> => {
  const clone = { ...VALID } as Record<string, unknown>;
  delete clone[field];
  return clone;
};

describe('hasWorkerEvalRecordShape', () => {
  it('accepts a complete record', () => {
    expect(hasWorkerEvalRecordShape(VALID)).toBe(true);
    expect(invalidWorkerEvalRecordFields(VALID)).toEqual([]);
  });

  it('requires every contract field', () => {
    for (const field of WORKER_EVAL_RECORD_FIELDS) {
      expect(hasWorkerEvalRecordShape(without(field))).toBe(false);
      expect(invalidWorkerEvalRecordFields(without(field))).toEqual([field]);
    }
  });

  it('rejects a record whose fields are present but unusable', () => {
    // Regression: the live gate checked `typeof record.verdict === 'string'`,
    // `typeof record.confidence === 'number'` and `!= null` for provenance and
    // evidenceRefs, so every one of these satisfied the durable-outcome gate.
    const nulled = Object.fromEntries(WORKER_EVAL_RECORD_FIELDS.map((field) => [field, null]));
    expect(hasWorkerEvalRecordShape(nulled)).toBe(false);
    expect(invalidWorkerEvalRecordFields(nulled)).toEqual(WORKER_EVAL_RECORD_FIELDS);

    expect(hasWorkerEvalRecordShape({ ...VALID, verdict: '' })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, verdict: '   ' })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, watch: '' })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: Number.NaN })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: Number.POSITIVE_INFINITY })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: 12 })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: -0.1 })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, provenance: false })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, provenance: {} })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, provenance: '' })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, evidenceRefs: false })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, evidenceRefs: [] })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, evidenceRefs: [null] })).toBe(false);
    expect(hasWorkerEvalRecordShape({ ...VALID, evidenceRefs: [''] })).toBe(false);
  });

  it('accepts the boundary values that are legitimate', () => {
    // 0 and 1 are real confidences, and provenance may be a reference string.
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: 0 })).toBe(true);
    expect(hasWorkerEvalRecordShape({ ...VALID, confidence: 1 })).toBe(true);
    expect(hasWorkerEvalRecordShape({ ...VALID, provenance: 'exec-1' })).toBe(true);
    expect(hasWorkerEvalRecordShape({ ...VALID, evidenceRefs: ['a', 'b'] })).toBe(true);
  });
});
