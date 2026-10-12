/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { BRIEF_LIMITS } from '../../../../../common/entity_analytics/executive_brief/constants';
import { SignalUnavailableError } from './define_signal';
import { identityResolution, resolveEntities } from './resolve_entities';
import type { EntityResolution } from './resolve_entities';
import { runSignals } from './run_signals';
import type { BriefSignal, EntityRef, SignalContext, SignalOutput, SignalScope } from './types';

jest.mock('./resolve_entities', () => {
  const actual = jest.requireActual('./resolve_entities');
  return { ...actual, resolveEntities: jest.fn() };
});
const resolveEntitiesMock = resolveEntities as jest.MockedFunction<typeof resolveEntities>;

const ref = (euid: string): EntityRef => ({
  euid,
  type: euid.startsWith('host:') ? 'host' : 'user',
  name: euid.split(':')[1],
});

const createCtx = (): SignalContext => ({
  esClient: elasticsearchServiceMock.createElasticsearchClient(),
  spaceId: 'default',
  timeRange: { from: '2026-10-05T00:00:00.000Z', to: '2026-10-12T00:00:00.000Z' },
  now: new Date('2026-10-12T00:00:00.000Z'),
  logger: loggingSystemMock.createLogger(),
  user: { username: 'analyst' },
  getCasesClient: async () => undefined,
});

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const signal = <TScope extends SignalScope = 'tenant'>(
  id: string,
  run: BriefSignal<TScope>['run'],
  overrides: Partial<BriefSignal<TScope>> = {}
): BriefSignal<TScope> => ({
  id,
  title: `Signal ${id}`,
  capability: 'detections',
  scope: 'tenant' as TScope,
  isAvailable: async () => ({ available: true }),
  run,
  ...overrides,
});

const factOutput = (entity: EntityRef, extra: Partial<SignalOutput> = {}): SignalOutput => ({
  facts: [{ kind: 'alert_activity', title: `fact ${entity.name}`, entities: [entity] }],
  ...extra,
});

describe('runSignals', () => {
  beforeEach(() => {
    resolveEntitiesMock.mockReset();
    resolveEntitiesMock.mockImplementation(async ({ refs }) => identityResolution(refs));
  });

  it('runs at most signalConcurrency signals at once', async () => {
    let active = 0;
    let maxActive = 0;
    const signals = Array.from({ length: 7 }, (_, i) =>
      signal(`s${i}`, async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active--;
        return factOutput(ref(`user:u${i}`));
      })
    );

    const evidence = await runSignals(createCtx(), signals, {
      abortSignal: new AbortController().signal,
    });

    expect(maxActive).toBe(BRIEF_LIMITS.signalConcurrency);
    expect(evidence.signals.every(({ status }) => status === 'ok')).toBe(true);
  });

  it('records statuses per signal and never fails the run because of one signal', async () => {
    const neverRun = jest.fn();
    const indexNotFound = Object.assign(new Error('no such index'), {
      meta: { body: { error: { type: 'index_not_found_exception' } } },
    });
    const ctx = createCtx();
    const evidence = await runSignals(
      ctx,
      [
        signal('ok', async () => factOutput(ref('user:ann'))),
        signal('empty', async () => ({ facts: [] })),
        signal('slow', () => new Promise<SignalOutput>(() => undefined), { timeoutMs: 20 }),
        signal('disabled', neverRun, {
          isAvailable: async () => ({ available: false, reason: 'Risk scoring is not enabled.' }),
        }),
        signal('no_index', async () => {
          throw indexNotFound;
        }),
        signal('not_set_up', async () => {
          throw new SignalUnavailableError('Attack Discovery has not run yet.');
        }),
        signal('broken', async () => {
          throw new Error('kaboom');
        }),
      ],
      { abortSignal: new AbortController().signal }
    );

    expect(evidence.signals.map(({ id, status, reason }) => ({ id, status, reason }))).toEqual([
      { id: 'ok', status: 'ok', reason: undefined },
      { id: 'empty', status: 'empty', reason: undefined },
      { id: 'slow', status: 'timeout', reason: expect.stringContaining('did not answer') },
      { id: 'disabled', status: 'unavailable', reason: 'Risk scoring is not enabled.' },
      { id: 'no_index', status: 'unavailable', reason: expect.any(String) },
      { id: 'not_set_up', status: 'unavailable', reason: 'Attack Discovery has not run yet.' },
      { id: 'broken', status: 'error', reason: 'kaboom' },
    ]);
    expect(neverRun).not.toHaveBeenCalled();
    expect(evidence.facts).toHaveLength(1);
    expect(evidence.signals[0]).toMatchObject({
      factCount: 1,
      linkCount: 0,
      capability: 'detections',
    });
    expect(ctx.logger.warn).toHaveBeenCalledWith(expect.stringContaining('kaboom'));
  });

  it('passes an abort signal that fires on the per-signal timeout', async () => {
    let received: AbortSignal | undefined;
    const evidence = await runSignals(
      createCtx(),
      [
        signal(
          'slow',
          (_ctx, _input, abortSignal) => {
            received = abortSignal;
            return new Promise<SignalOutput>(() => undefined);
          },
          { timeoutMs: 10 }
        ),
      ],
      { abortSignal: new AbortController().signal }
    );
    expect(evidence.signals[0].status).toBe('timeout');
    expect(received?.aborted).toBe(true);
  });

  it('registers evidence in signal order, not completion order', async () => {
    const evidence = await runSignals(
      createCtx(),
      [
        signal('first', async () => {
          await delay(20);
          return factOutput(ref('user:slow'));
        }),
        signal('second', async () => factOutput(ref('user:fast'))),
      ],
      { abortSignal: new AbortController().signal }
    );
    expect(evidence.facts.map(({ signalId }) => signalId)).toEqual(['first', 'second']);
    expect(evidence.entities['ENT-1'].euid).toBe('user:slow');
  });

  it('caps candidates by nominations, then risk, and passes golden entities to entity signals', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ref(`user:u${String(i).padStart(2, '0')}`));
    const alias = ref('user:ann@h1@local');
    const golden = ref('user:ann@okta');
    resolveEntitiesMock.mockImplementation(async ({ refs }) => {
      const base = identityResolution(refs);
      const resolution: EntityResolution = {
        golden: (euid) => (euid === alias.euid ? golden.euid : euid),
        get: (euid) =>
          euid === golden.euid
            ? { ...golden, aliasCount: 1, attributes: { euid: golden.euid } }
            : base.get(euid),
      };
      return resolution;
    });
    const entityRun = jest.fn(async (_ctx: SignalContext, _input: { entities: EntityRef[] }) => ({
      facts: [],
    }));

    await runSignals(
      createCtx(),
      [
        signal('wide', async () => ({
          facts: [],
          candidates: many,
          entityAttributes: [{ euid: 'user:u29', riskScore: 90 }],
        })),
        signal('narrow', async () => ({ facts: [], candidates: [alias, ref('user:u10')] })),
        signal('also', async () => ({ facts: [], candidates: [golden] })),
        signal<'entities'>('per_entity', entityRun, { scope: 'entities' }),
      ],
      { abortSignal: new AbortController().signal }
    );

    expect(entityRun).toHaveBeenCalledTimes(1);
    const { entities } = entityRun.mock.calls[0][1];
    expect(entities).toHaveLength(BRIEF_LIMITS.maxCandidates);
    // ann (2 signals through alias + golden), u10 (2 signals), then u29 (risk), then by euid.
    expect(entities.slice(0, 4).map(({ euid }) => euid)).toEqual([
      'user:ann@okta',
      'user:u10',
      'user:u29',
      'user:u00',
    ]);
  });

  it('marks entity signals empty without running them when there are no candidates', async () => {
    const entityRun = jest.fn();
    const evidence = await runSignals(
      createCtx(),
      [signal<'entities'>('per_entity', entityRun, { scope: 'entities' })],
      { abortSignal: new AbortController().signal }
    );
    expect(entityRun).not.toHaveBeenCalled();
    expect(evidence.signals[0].status).toBe('empty');
  });

  it('resolves entities first introduced by entity signals', async () => {
    const evidence = await runSignals(
      createCtx(),
      [
        signal('tenant', async () =>
          factOutput(ref('user:ann'), { candidates: [ref('user:ann')] })
        ),
        signal<'entities'>(
          'per_entity',
          async () => ({
            facts: [],
            links: [{ type: 'owns', from: ref('user:ann'), to: ref('host:new') }],
          }),
          { scope: 'entities' }
        ),
      ],
      { abortSignal: new AbortController().signal }
    );
    expect(resolveEntitiesMock).toHaveBeenCalledTimes(2);
    expect(resolveEntitiesMock.mock.calls[1][0].refs.map(({ euid }) => euid)).toEqual(['host:new']);
    expect(evidence.links).toEqual([
      { id: 'L-1', type: 'owns', from: 'ENT-1', to: 'ENT-2', factIds: [] },
    ]);
  });

  it('falls back to unresolved entities when resolution fails', async () => {
    resolveEntitiesMock.mockRejectedValue(new Error('store down'));
    const evidence = await runSignals(
      createCtx(),
      [signal('tenant', async () => factOutput(ref('user:ann')))],
      { abortSignal: new AbortController().signal }
    );
    expect(evidence.entities['ENT-1']).toMatchObject({ euid: 'user:ann', name: 'ann' });
  });

  it('throws when the job is aborted', async () => {
    const controller = new AbortController();
    const promise = runSignals(
      createCtx(),
      [
        signal('slow', async () => {
          await delay(20);
          return { facts: [] };
        }),
      ],
      { abortSignal: controller.signal }
    );
    controller.abort(new Error('cancelled'));
    await expect(promise).rejects.toThrow('cancelled');
  });
});
