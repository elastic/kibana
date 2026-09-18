/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALUATION_RECORD_FIELDS,
  evaluateDurableReport,
  hasEvaluationRecordShape,
  missingEvaluationRecordFields,
} from './durable_outcome';

const RUN_ID = 'dwf-l4-run-1234';
const RUN_STARTED_AT = '2026-08-18T10:00:00.000Z';

const shapeComplete = {
  report_status: 'DRAFT',
  timeline: [{ summary: 'process event' }],
  validated_iocs: [{ type: 'network_destination', value: '185.220.101.42', status: 'confirmed' }],
  unresolved_questions: ['Is patient zero identified?'],
  confidence_assessment: { overall: 'medium' },
};

const hit = (source: Record<string, unknown>, timestamp: string) => ({
  _source: { '@timestamp': timestamp, ...source },
});

describe('evaluateDurableReport', () => {
  it('accepts a report correlated to this run with a complete shape', () => {
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [hit({ ...shapeComplete, run_id: RUN_ID }, '2026-08-18T10:01:00.000Z')],
    });

    expect(result).toMatchObject({
      recentCount: 1,
      correlatedCount: 1,
      shapeValidCount: 1,
      success: true,
    });
  });

  it('does not accept a report from another run, however recent', () => {
    // The regression: any DRAFT written in the last five minutes satisfied
    // `persistedCount > 0`, so an earlier spec, a retry or a concurrent run
    // could make this invocation look durable.
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [hit({ ...shapeComplete, run_id: 'some-other-run' }, '2026-08-18T10:01:00.000Z')],
    });

    expect(result.recentCount).toBe(1);
    expect(result.correlatedCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('does not accept a correlated report that predates the run', () => {
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [hit({ ...shapeComplete, run_id: RUN_ID }, '2026-08-18T09:00:00.000Z')],
    });

    expect(result.recentCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('does not accept a correlated document without a timestamp', () => {
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [{ _source: { ...shapeComplete, run_id: RUN_ID } }],
    });

    expect(result.recentCount).toBe(0);
    expect(result.success).toBe(false);
  });

  it('fails a correlated report with an incomplete Evaluation Record shape', () => {
    // The second regression: the shape was computed and logged but never gated,
    // so a malformed stored document still produced a green test.
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [hit({ report_status: 'DRAFT', run_id: RUN_ID }, '2026-08-18T10:01:00.000Z')],
    });

    expect(result.correlatedCount).toBe(1);
    expect(result.shapeValidCount).toBe(0);
    expect(result.missingFields).toEqual(
      expect.arrayContaining(['timeline', 'validated_iocs', 'confidence_assessment'])
    );
    expect(result.success).toBe(false);
  });

  it('fails when nothing was persisted by this run', () => {
    const result = evaluateDurableReport({
      runId: RUN_ID,
      runStartedAt: RUN_STARTED_AT,
      hits: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('evaluation record shape', () => {
  const without = (field: string): Record<string, unknown> => {
    const clone = { ...shapeComplete } as Record<string, unknown>;
    delete clone[field];
    return clone;
  };

  it('requires every contract field', () => {
    expect(hasEvaluationRecordShape(shapeComplete)).toBe(true);
    for (const field of EVALUATION_RECORD_FIELDS) {
      expect(hasEvaluationRecordShape(without(field))).toBe(false);
      expect(missingEvaluationRecordFields(without(field))).toEqual([field]);
    }
  });

  it('treats an explicitly undefined field as missing', () => {
    expect(hasEvaluationRecordShape({ ...shapeComplete, timeline: undefined })).toBe(false);
  });
});
