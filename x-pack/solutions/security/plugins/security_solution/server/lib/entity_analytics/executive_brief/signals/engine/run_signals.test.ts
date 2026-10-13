/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { ResolutionClient } from '@kbn/entity-store/server';
import { BRIEF_LIMITS } from '../../../../../../common/entity_analytics/executive_brief/constants';
import { runSignals } from './run_signals';
import type { Signal, SignalInput, SignalResult } from './types';

jest.mock('../../../../../../common/entity_analytics/executive_brief/constants', () => {
  const actual = jest.requireActual(
    '../../../../../../common/entity_analytics/executive_brief/constants'
  );
  return { ...actual, BRIEF_LIMITS: { ...actual.BRIEF_LIMITS, signalTimeoutMs: 20 } };
});

const input: SignalInput = {
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  resolutionClient: {} as ResolutionClient,
  spaceId: 'default',
  username: 'analyst',
  profileId: 'u_analyst',
  timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
  abortSignal: new AbortController().signal,
  logger: loggingSystemMock.createLogger(),
};

const signal = (id: string, run: Signal['run']): Signal => ({ id, title: id, run });

/** One fact per EUID, each about that one entity. */
const factsAbout = (signalId: string, ...euids: string[]): SignalResult => ({
  facts: euids.map((euid) => ({ signalId, title: euid, entityIds: [euid] })),
  entities: euids.map((euid) => ({ entity: { id: euid, name: euid.slice(5), type: 'user' } })),
});

describe('runSignals', () => {
  it('records each failure on its own signal and keeps the others', async () => {
    const indexNotFound = new errors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception' } },
      headers: {},
      warnings: null,
      meta: {},
    } as unknown as ConstructorParameters<typeof errors.ResponseError>[0]);

    const evidence = await runSignals(
      [
        signal('ok', async () => factsAbout('ok', 'user:ann')),
        signal(
          'slow',
          ({ abortSignal }) =>
            new Promise<SignalResult>((_, reject) => {
              abortSignal.addEventListener('abort', () => reject(abortSignal.reason));
            })
        ),
        signal('broken', async () => {
          throw new Error('kaboom');
        }),
        signal('no_index', async () => {
          throw indexNotFound;
        }),
      ],
      input
    );

    expect(evidence.signals).toEqual([
      expect.objectContaining({ id: 'ok', status: 'ok', factCount: 1 }),
      expect.objectContaining({ id: 'slow', status: 'timeout', reason: expect.any(String) }),
      expect.objectContaining({ id: 'broken', status: 'error', reason: 'kaboom' }),
      expect.objectContaining({ id: 'no_index', status: 'unavailable' }),
    ]);
    expect(evidence.facts).toHaveLength(1);
  });

  it('numbers facts in signal order and keys each entity once by EUID', async () => {
    const evidence = await runSignals(
      [
        signal('first', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return factsAbout('first', 'user:ann', 'user:bob');
        }),
        signal('second', async () => factsAbout('second', 'user:ann')),
      ],
      input
    );

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
        return { facts: [], entities: [] };
      })
    );

    await runSignals(signals, input);

    expect(maxActive).toBe(BRIEF_LIMITS.signalConcurrency);
  });
});
