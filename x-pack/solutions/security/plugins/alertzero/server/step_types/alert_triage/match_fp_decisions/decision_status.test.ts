/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../../../common/step_types/triage_decisions_index';
import { readDecisionStatus } from './decision_status';

const NOW = Date.parse('2026-10-27T12:00:00.000Z');
const ID = 'fp-decision-0123456789abcdef';

const stored = (overrides: Record<string, unknown> = {}) => ({
  type: 'security.fp_decision',
  expires_at: new Date(NOW + 86_400_000).toISOString(),
  attributes: { decision: 'false_positive' },
  ...overrides,
});

const statusOf = (get: jest.Mock) => readDecisionStatus({ es: { get }, id: ID, now: NOW });

describe('readDecisionStatus', () => {
  it('reads the decision by its id from the decisions index', async () => {
    const get = jest.fn().mockResolvedValue({ _source: stored() });

    await expect(statusOf(get)).resolves.toBe('active');

    expect(get).toHaveBeenCalledWith({ index: TRIAGE_DECISIONS_AI_INDEX_DEST.value, id: ID });
  });

  it.each([['deleted'], ['archived']])(
    'reads a decision whose lifecycle is %s as gone, which is what a revoke does',
    async (status) => {
      const get = jest
        .fn()
        .mockResolvedValue({ _source: stored({ governance: { lifecycle: { status } } }) });

      await expect(statusOf(get)).resolves.toBe('gone');
    }
  );

  it('reads a missing decision (a 404) as gone', async () => {
    const get = jest.fn().mockRejectedValue(Object.assign(new Error('nf'), { statusCode: 404 }));

    await expect(statusOf(get)).resolves.toBe('gone');
  });

  it('reads an expired decision as lapsed, not gone: what it did while in force must stay', async () => {
    const get = jest.fn().mockResolvedValue({
      _source: stored({ expires_at: new Date(NOW - 1000).toISOString() }),
    });

    await expect(statusOf(get)).resolves.toBe('lapsed');
  });

  it('reads a document that is not a decision of this feature as lapsed', async () => {
    const get = jest.fn().mockResolvedValue({ _source: stored({ type: 'something.else' }) });

    await expect(statusOf(get)).resolves.toBe('lapsed');
  });

  it.each([[403], [429], [500]])(
    'rethrows a %i, so a read that failed is never taken for a revoke',
    async (statusCode) => {
      const get = jest.fn().mockRejectedValue(Object.assign(new Error('nope'), { statusCode }));

      await expect(statusOf(get)).rejects.toThrow('nope');
    }
  );
});
