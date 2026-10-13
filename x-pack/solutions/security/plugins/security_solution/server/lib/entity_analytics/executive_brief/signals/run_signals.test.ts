/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import { runSignals } from './run_signals';
import type { BriefSignal, EntityRef, SignalContext, SignalOutput, SignalScope } from './types';

jest.mock('./resolve_entities', () => {
  const actual = jest.requireActual('./resolve_entities');
  return { ...actual, resolveEntities: async () => actual.identityResolution() };
});

const ref = (euid: string): EntityRef => ({ euid, type: 'user', name: euid.slice(5) });

const ctx: SignalContext = {
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  spaceId: 'default',
  timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
  now: new Date('2026-10-12T00:00:00.000Z'),
  logger: loggingSystemMock.createLogger(),
  user: { username: 'analyst' },
  getCasesClient: async () => undefined,
};

const signal = <TScope extends SignalScope = 'tenant'>(
  id: string,
  run: BriefSignal<TScope>['run'],
  overrides: Partial<BriefSignal<TScope>> = {}
): BriefSignal<TScope> => ({
  id,
  title: id,
  scope: 'tenant' as TScope,
  isAvailable: async () => ({ available: true }),
  run,
  ...overrides,
});

const factOf = (euid: string): SignalOutput => ({
  facts: [{ kind: 'alert_activity', title: euid, entities: [ref(euid)] }],
});

const run = (signals: readonly BriefSignal[]) =>
  runSignals(ctx, signals, { abortSignal: new AbortController().signal });

describe('runSignals', () => {
  it('records each failure on its own signal and keeps the others', async () => {
    const indexNotFound = Object.assign(new Error('no such index'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });

    const { evidence, outcomes } = await run([
      signal('ok', async () => factOf('user:ann')),
      signal('slow', () => new Promise<SignalOutput>(() => undefined), { timeoutMs: 20 }),
      signal('broken', async () => {
        throw new Error('kaboom');
      }),
      signal('no_index', async () => {
        throw indexNotFound;
      }),
    ]);

    expect(outcomes).toEqual([
      expect.objectContaining({ id: 'ok', status: 'ok', factCount: 1 }),
      expect.objectContaining({ id: 'slow', status: 'timeout', reason: expect.any(String) }),
      expect.objectContaining({ id: 'broken', status: 'error', reason: 'kaboom' }),
      expect.objectContaining({ id: 'no_index', status: 'unavailable' }),
    ]);
    // Only the status and duration are kept on the evidence.
    expect(evidence.signals.broken).toStrictEqual({ status: 'error', took: expect.any(Number) });
    expect(evidence.facts).toHaveLength(1);
  });

  it('runs at most signalConcurrency signals at once', async () => {
    let active = 0;
    let maxActive = 0;
    const signals = Array.from({ length: 7 }, (_, i) =>
      signal(`s${i}`, async () => {
        maxActive = Math.max(maxActive, ++active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;
        return { facts: [] };
      })
    );

    await run(signals);

    expect(maxActive).toBe(BRIEF_LIMITS.signalConcurrency);
  });

  it('passes at most maxCandidates entities to entity signals', async () => {
    const candidates = Array.from({ length: BRIEF_LIMITS.maxCandidates + 5 }, (_, i) =>
      ref(`user:u${String(i).padStart(2, '0')}`)
    );
    const entityRun = jest.fn(async () => ({ facts: [] }));

    await run([
      signal('wide', async () => ({ facts: [], candidates })),
      signal<'entities'>('per_entity', entityRun, { scope: 'entities' }),
    ]);

    expect(entityRun).toHaveBeenCalledWith(
      ctx,
      { entities: candidates.slice(0, BRIEF_LIMITS.maxCandidates) },
      expect.anything()
    );
  });
});
