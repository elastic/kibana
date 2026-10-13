/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { BRIEF_LIMITS } from '../../../../../../common/entity_analytics/executive_brief/constants';
import { runSignals } from './run_signals';
import type { BriefSignal, FactDraft, SignalContext } from './types';

const ctx: SignalContext = {
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  spaceId: 'default',
  timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
  logger: loggingSystemMock.createLogger(),
  username: 'analyst',
};

const signal = (
  id: string,
  run: BriefSignal['run'],
  overrides: Partial<BriefSignal> = {}
): BriefSignal => ({ id, title: id, run, ...overrides });

const factAbout = (euid: string): FactDraft => ({
  title: euid,
  entities: [{ entity: { id: euid, name: euid.slice(5), type: 'user' } }],
});

const run = (signals: readonly BriefSignal[]) =>
  runSignals(ctx, signals, { abortSignal: new AbortController().signal });

describe('runSignals', () => {
  it('records each failure on its own signal and keeps the others', async () => {
    const indexNotFound = new errors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
      headers: {},
      warnings: null,
      meta: {},
    } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

    const { evidence, outcomes } = await run([
      signal('ok', async () => [factAbout('user:ann')]),
      signal('slow', () => new Promise<FactDraft[]>(() => undefined), { timeoutMs: 20 }),
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

  it('numbers facts in signal order and keys each entity once by EUID', async () => {
    const { evidence } = await run([
      signal('first', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [factAbout('user:ann'), factAbout('user:bob')];
      }),
      signal('second', async () => [factAbout('user:ann')]),
    ]);

    expect(evidence.facts.map(({ id, signalId, entityIds }) => [id, signalId, entityIds])).toEqual([
      [1, 'first', ['user:ann']],
      [2, 'first', ['user:bob']],
      [3, 'second', ['user:ann']],
    ]);
    expect(Object.keys(evidence.entities)).toEqual(['user:ann', 'user:bob']);
  });

  it('runs at most signalConcurrency signals at once', async () => {
    let active = 0;
    let maxActive = 0;
    const signals = Array.from({ length: 7 }, (_, i) =>
      signal(`s${i}`, async () => {
        maxActive = Math.max(maxActive, ++active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;
        return [];
      })
    );

    await run(signals);

    expect(maxActive).toBe(BRIEF_LIMITS.signalConcurrency);
  });
});
