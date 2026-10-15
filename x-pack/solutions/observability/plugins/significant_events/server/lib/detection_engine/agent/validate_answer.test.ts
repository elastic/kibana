/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAnswer, AgentCase } from './types';
import { guardSeverity, validateAnswer } from './validate_answer';

const BASE_CASE: AgentCase = {
  kind: 'new_event',
  detection: {
    fingerprint: 'health:error_ratio:lab:payments',
    strategy: 'health_checks',
    service: 'payments',
    title: 'payments error ratio is 40%',
    description: '',
    value: 0.4,
    unit: 'ratio',
    importance: 90,
  },
  evidence: [
    {
      id: 'E1',
      fingerprint: 'health:error_ratio:lab:payments',
      title: 'errors',
      unit: 'ratio',
      query: 'FROM logs',
      result: 'found',
      rows: [{ message: 'gateway timeout' }],
    },
    {
      id: 'E2',
      fingerprint: 'ki:lab:timeout',
      title: 'timeouts',
      unit: 'count',
      query: 'FROM logs',
      result: 'empty',
      rows: [],
    },
  ],
  firing_customer_alerts: [],
  related_services: [],
  memory: [],
};

const ANSWER: AgentAnswer = {
  verdicts: [
    { evidence_id: 'E1', verdict: 'confirms', note: 'timeouts in rows' },
    { evidence_id: 'E2', verdict: 'inconclusive', note: 'no rows' },
  ],
  severity: 'high',
  title: 'Payments failing',
  summary: 'Payments returns gateway timeouts.',
};

describe('validateAnswer', () => {
  it('accepts an answer that cites only evidence in the case', () => {
    const result = validateAnswer(BASE_CASE, ANSWER);

    expect(result).toEqual({ ok: true, answer: ANSWER, corrections: [] });
  });

  it('rejects an answer citing evidence the case does not hold', () => {
    const result = validateAnswer(BASE_CASE, {
      ...ANSWER,
      verdicts: [{ evidence_id: 'E9', verdict: 'confirms', note: '' }],
    });

    expect(result).toEqual({
      ok: false,
      reason: 'cites evidence "E9" that the case does not hold',
    });
  });

  it('downgrades a confirmation that has no rows behind it', () => {
    const result = validateAnswer(BASE_CASE, {
      ...ANSWER,
      verdicts: [
        { evidence_id: 'E1', verdict: 'confirms', note: '' },
        { evidence_id: 'E2', verdict: 'confirms', note: '' },
      ],
    });

    expect(result.ok && result.answer.verdicts[1].verdict).toBe('inconclusive');
    expect(result.ok && result.corrections).toHaveLength(1);
  });

  it('records skipped evidence as inconclusive', () => {
    const result = validateAnswer(BASE_CASE, { ...ANSWER, verdicts: [ANSWER.verdicts[0]] });

    expect(result.ok && result.answer.verdicts.map((verdict) => verdict.evidence_id)).toEqual([
      'E1',
      'E2',
    ]);
  });

  it('rejects an answer that ignores a join proposal', () => {
    const result = validateAnswer(
      {
        ...BASE_CASE,
        kind: 'join',
        join_proposal: {
          event_id: 'ev1',
          reason: 'same service',
          relation: 'same_service',
          minutes_apart: 2,
        },
      },
      ANSWER
    );

    expect(result.ok).toBe(false);
  });
});

describe('guardSeverity', () => {
  it('caps critical at high with one confirmation and no customer alert', () => {
    expect(
      guardSeverity({ severity: 'critical', confirmations: 1, hasCustomerAlert: false })
    ).toEqual({
      severity: 'high',
      guard:
        'Critical needs two confirming pieces of evidence or a firing customer alert; capped at high.',
    });
  });

  it('keeps critical when a customer alert backs it', () => {
    expect(
      guardSeverity({ severity: 'critical', confirmations: 1, hasCustomerAlert: true })
    ).toEqual({
      severity: 'critical',
    });
  });

  it('caps at medium when nothing confirmed', () => {
    expect(
      guardSeverity({ severity: 'high', confirmations: 0, hasCustomerAlert: false }).severity
    ).toBe('medium');
  });
});
