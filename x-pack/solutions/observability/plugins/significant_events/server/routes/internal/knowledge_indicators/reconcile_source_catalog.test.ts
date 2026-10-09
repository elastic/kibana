/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourcesClient } from '@kbn/nightshift-sources-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';
import type { SourceKnowledgeStateClient } from '../../../lib/knowledge_indicators/source_knowledge_state';
import { StatusError } from '../../../lib/errors/status_error';
import {
  createSourceChangeListener,
  reconcileSourceCatalog,
  reconcileSourceRevision,
  resetSourceKnowledge,
} from './reconcile_source_catalog';

const request = { spaceId: 'default' } as KibanaRequest;

// `makeSource` derives a slug as `<id>-slug`, so the id is recovered by stripping the suffix.
const idOfSlug = (sourceSlug: string) => sourceSlug.replace(/-slug$/, '');

const runningExecution = (sourceSlug: string) => ({
  status: ExecutionStatus.RUNNING,
  concurrencyGroupKey: `nightshift-source-onboarding-${sourceSlug}:${idOfSlug(sourceSlug)}`,
});

const makeSource = (
  overrides: Partial<NightshiftSource> & Pick<NightshiftSource, 'id'>
): NightshiftSource => ({
  title: overrides.id,
  description: '',
  tags: [],
  esql: 'FROM logs-*',
  type: 'logs',
  slug: `${overrides.id}-slug`,
  view_name: `$.nightshift.sources.default.${overrides.id}`,
  enabled: true,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeSourcesClient = (sources: NightshiftSource[]): SourcesClient =>
  ({
    list: jest.fn().mockResolvedValue({
      sources,
      total: sources.length,
      page: 1,
      per_page: 100,
    }),
  } as unknown as SourcesClient);

const makeKiClient = (reconcileIds: string[] = [], ownedRuleIds: string[] = reconcileIds) => ({
  setSourceRulesEnabled: jest.fn().mockResolvedValue(undefined),
  findSourceIdsWithOwnedRules: jest.fn().mockResolvedValue(ownedRuleIds),
  getSourceIdsToReconcile: jest.fn().mockResolvedValue(reconcileIds),
  deleteOwnedRules: jest.fn().mockResolvedValue(undefined),
  deleteAllQueries: jest.fn().mockResolvedValue(undefined),
  deleteIndicators: jest.fn().mockResolvedValue(undefined),
});

describe('reconcileSourceCatalog', () => {
  const cancelBySource = jest.fn().mockResolvedValue(null);
  const onboardingWithRuns = (sourceSlugs: string[]) => ({
    cancelBySource,
    getNonTerminalExecutions: jest.fn().mockResolvedValue(sourceSlugs.map(runningExecution)),
  });

  beforeEach(() => {
    cancelBySource.mockClear();
  });

  it('disables rules and cancels onboarding by slug for a disabled source', async () => {
    const kiClient = makeKiClient(['disabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      onboardingClient: onboardingWithRuns(['disabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'disabled-source',
      sourceSlug: 'disabled-source-slug',
      request,
    });
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancelBySource.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.setSourceRulesEnabled.mock.invocationCallOrder[0]
    );
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalled();
  });

  it('aligns the remaining sources and sweeps orphans before reporting a failing source', async () => {
    const kiClient = makeKiClient(['first', 'second']);
    cancelBySource.mockRejectedValueOnce(new Error('cancel rejected'));

    await expect(
      reconcileSourceCatalog({
        sourcesClient: makeSourcesClient([
          makeSource({ id: 'first', enabled: false }),
          makeSource({ id: 'second', enabled: false }),
        ]),
        kiClient,
        onboardingClient: onboardingWithRuns(['first-slug', 'orphan-slug']),
        maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
        request,
      })
    ).rejects.toThrow('cancel rejected');

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('first', false);
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('second', false);
    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'orphan',
      sourceSlug: 'orphan-slug',
      request,
    });
  });

  it('skips a source whose lease is held and still aligns the others', async () => {
    const kiClient = makeKiClient(['busy', 'idle']);
    const sourceKnowledgeState: SourceKnowledgeStateClient = {
      runExclusive: jest.fn(async ({ sourceId, run }) => {
        if (sourceId === 'busy') {
          throw new StatusError('A write is in progress', 409);
        }
        return run(
          { revision: '2026-01-01T00:00:00.000Z', onboardingScheduled: true, lease: null },
          jest.fn()
        );
      }),
      write: jest.fn(),
    };

    await expect(
      reconcileSourceCatalog({
        sourcesClient: {
          ...makeSourcesClient([makeSource({ id: 'busy' }), makeSource({ id: 'idle' })]),
          get: jest.fn(async (id: string) => ({ source: makeSource({ id }) })),
        } as unknown as SourcesClient,
        kiClient,
        onboardingClient: onboardingWithRuns([]),
        sourceKnowledgeState,
        maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
        request,
      })
    ).resolves.toEqual(expect.objectContaining({ reconcileIds: ['busy', 'idle'] }));

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('idle', true);
  });

  it('stops scheduling onboarding once the sweep budget is spent', async () => {
    const sources = ['a', 'b', 'c'].map((id) => makeSource({ id }));
    const states = new Map<string, { revision?: string; onboardingScheduled: boolean }>();
    const sourceKnowledgeState: SourceKnowledgeStateClient = {
      runExclusive: jest.fn(async ({ sourceId, run }) => {
        const state = states.get(sourceId) ?? { revision: undefined, onboardingScheduled: false };
        states.set(sourceId, state);
        return run({ ...state, lease: null }, async (patch) => {
          Object.assign(state, patch);
        });
      }),
      write: jest.fn(),
    };
    const scheduleSourceOnboarding = jest.fn(async () => true);

    await reconcileSourceCatalog({
      sourcesClient: {
        ...makeSourcesClient(sources),
        get: jest.fn(async (id: string) => ({ source: makeSource({ id }) })),
      } as unknown as SourcesClient,
      kiClient: makeKiClient(),
      onboardingClient: onboardingWithRuns(['running-slug']),
      sourceKnowledgeState,
      scheduleSourceOnboarding,
      maxScheduled: 2,
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    // One slot is taken by the run already going, so only one new source starts.
    expect(scheduleSourceOnboarding).toHaveBeenCalledTimes(1);
    expect(states.get('a')?.onboardingScheduled).toBe(true);
    expect(states.get('b')?.onboardingScheduled).toBe(false);
    expect(states.get('c')?.onboardingScheduled).toBe(false);
  });

  it('cancels a disabled source run before waiting for its lease', async () => {
    const kiClient = makeKiClient(['disabled-source']);
    const order: string[] = [];
    cancelBySource.mockImplementationOnce(async () => {
      order.push('cancel');
      return null;
    });
    const sourceKnowledgeState: SourceKnowledgeStateClient = {
      runExclusive: jest.fn(async ({ run }) => {
        order.push('lease');
        return run({ revision: undefined, onboardingScheduled: false, lease: null }, jest.fn());
      }),
      write: jest.fn(),
    };

    const disabled = makeSource({ id: 'disabled-source', enabled: false });
    await reconcileSourceCatalog({
      sourcesClient: {
        ...makeSourcesClient([disabled]),
        get: jest.fn(async () => ({ source: disabled })),
      } as unknown as SourcesClient,
      kiClient,
      onboardingClient: onboardingWithRuns(['disabled-source-slug']),
      sourceKnowledgeState,
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    // The first lease is the revision reconcile; the enabled-flag alignment must cancel before its own.
    expect(order).toEqual(['lease', 'cancel', 'lease']);
  });

  it('cancels the other orphan runs and retires gone sources when one orphan cancel fails', async () => {
    const kiClient = makeKiClient(['gone-1']);
    cancelBySource.mockRejectedValueOnce(new Error('orphan cancel rejected'));

    await expect(
      reconcileSourceCatalog({
        sourcesClient: makeSourcesClient([]),
        kiClient,
        onboardingClient: onboardingWithRuns(['orphan-a-slug', 'orphan-b-slug']),
        maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
        request,
      })
    ).rejects.toThrow('orphan cancel rejected');

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'orphan-b',
      sourceSlug: 'orphan-b-slug',
      request,
    });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-1');
  });

  it('retires the other gone sources when retiring one fails', async () => {
    const kiClient = makeKiClient(['gone-1', 'gone-2']);
    kiClient.deleteOwnedRules.mockRejectedValueOnce(new Error('rules unavailable'));

    await expect(
      reconcileSourceCatalog({
        sourcesClient: makeSourcesClient([]),
        kiClient,
        onboardingClient: onboardingWithRuns([]),
        maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
        request,
      })
    ).rejects.toThrow('rules unavailable');

    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-2');
  });

  it('enables rules for an enabled source and leaves onboarding running', async () => {
    const kiClient = makeKiClient(['enabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: onboardingWithRuns(['enabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('enabled-source', true);
    expect(cancelBySource).not.toHaveBeenCalled();
    expect(kiClient.deleteIndicators).not.toHaveBeenCalled();
  });

  it('does not re-enable rules while maintenance is paused', async () => {
    const kiClient = makeKiClient([], ['enabled-source', 'disabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([
        makeSource({ id: 'enabled-source' }),
        makeSource({ id: 'disabled-source', enabled: false }),
      ]),
      kiClient,
      onboardingClient: onboardingWithRuns(['disabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('paused') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledTimes(1);
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'disabled-source',
      sourceSlug: 'disabled-source-slug',
      request,
    });
  });

  it('skips cancel when no onboarding client is available', async () => {
    const kiClient = makeKiClient([], ['disabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancelBySource).not.toHaveBeenCalled();
  });

  it('cancels a disabled source that owns no rules without toggling rules', async () => {
    const kiClient = makeKiClient([], []);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      onboardingClient: onboardingWithRuns(['disabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'disabled-source',
      sourceSlug: 'disabled-source-slug',
      request,
    });
    expect(kiClient.setSourceRulesEnabled).not.toHaveBeenCalled();
  });

  it('leaves a disabled source alone when it has no running execution and no rules', async () => {
    const kiClient = makeKiClient([], []);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'disabled-source', enabled: false })]),
      kiClient,
      onboardingClient: onboardingWithRuns([]),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySource).not.toHaveBeenCalled();
    expect(kiClient.setSourceRulesEnabled).not.toHaveBeenCalled();
  });

  it('retires knowledge for an id that is no longer in the catalog', async () => {
    const kiClient = makeKiClient(['gone-source', 'enabled-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: onboardingWithRuns([]),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteAllQueries).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('gone-source');
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalledWith('enabled-source');
  });

  it('marks the detections of an id that is no longer in the catalog as processed', async () => {
    const markSourceDetectionsProcessed = jest.fn().mockResolvedValue(0);

    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient: makeKiClient(['gone-source', 'enabled-source']),
      onboardingClient: onboardingWithRuns([]),
      getDetectionClient: jest.fn().mockResolvedValue({ markSourceDetectionsProcessed }),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(markSourceDetectionsProcessed).toHaveBeenCalledTimes(1);
    expect(markSourceDetectionsProcessed).toHaveBeenCalledWith({
      sourceId: 'gone-source',
      processedBy: 'source-deleted',
    });
  });

  it('cancels a running execution whose slug has no catalog row', async () => {
    const kiClient = makeKiClient([]);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: onboardingWithRuns(['gone-source-slug', 'enabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySource).toHaveBeenCalledTimes(1);
    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'gone-source',
      sourceSlug: 'gone-source-slug',
      request,
    });
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalled();
  });

  it('cancels the run of a deleted source before retiring its knowledge', async () => {
    const kiClient = makeKiClient(['gone-source']);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([]),
      kiClient,
      onboardingClient: onboardingWithRuns(['gone-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'gone-source',
      sourceSlug: 'gone-source-slug',
      request,
    });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-source');
    expect(cancelBySource.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.deleteOwnedRules.mock.invocationCallOrder[0]
    );
  });

  it('cancels a run for a deleted source in a space other than default', async () => {
    const otherRequest = { spaceId: 'other' } as KibanaRequest;

    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient: makeKiClient([]),
      onboardingClient: onboardingWithRuns(['gone-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request: otherRequest,
    });

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'gone-source',
      sourceSlug: 'gone-source-slug',
      request: otherRequest,
    });
  });
});

describe('resetSourceKnowledge', () => {
  it('cancels the onboarding run by slug and id before dropping rules, queries and indicators', async () => {
    const kiClient = makeKiClient();
    const cancelBySource = jest.fn().mockResolvedValue(null);

    await resetSourceKnowledge({
      source: { id: 'source-1', slug: 'nginx-errors' },
      kiClient,
      onboardingClient: { cancelBySource },
      request,
    });

    expect(cancelBySource).toHaveBeenCalledWith({
      sourceId: 'source-1',
      sourceSlug: 'nginx-errors',
      request,
    });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteAllQueries).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('source-1');
    expect(cancelBySource.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.deleteOwnedRules.mock.invocationCallOrder[0]
    );
  });

  it('still drops the knowledge when workflows are unavailable', async () => {
    const kiClient = makeKiClient();

    await resetSourceKnowledge({
      source: { id: 'source-1', slug: 'nginx-errors' },
      kiClient,
      request,
    });

    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('source-1');
  });

  it('drops the knowledge even when cancelling the run fails, then reports the failure', async () => {
    const kiClient = makeKiClient();
    const cancelBySource = jest.fn().mockRejectedValue(new Error('no workflows privilege'));

    await expect(
      resetSourceKnowledge({
        source: { id: 'source-1', slug: 'nginx-errors' },
        kiClient,
        onboardingClient: { cancelBySource },
        request,
      })
    ).rejects.toThrow('no workflows privilege');

    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('source-1');
  });
});

describe('createSourceChangeListener', () => {
  const source = makeSource({ id: 'source' });
  const setup = () => {
    const enqueueReconciliation = jest.fn(async () => {});
    const ensurePeriodicReconciliation = jest.fn(async () => {});
    const listener = createSourceChangeListener({
      enqueueReconciliation,
      ensurePeriodicReconciliation,
    });
    return { listener, enqueueReconciliation, ensurePeriodicReconciliation };
  };

  it.each<SourceChangeEvent>([
    { type: 'created', source, request },
    { type: 'deleted', source, request },
    { type: 'updated', source: { ...source, enabled: false }, previous: source, request },
    {
      type: 'updated',
      source: { ...source, esql_updated_at: 'new revision' },
      previous: source,
      request,
    },
  ])('queues a $type change in its request space', async (event) => {
    const { listener, enqueueReconciliation, ensurePeriodicReconciliation } = setup();
    const otherRequest = { spaceId: 'other' } as KibanaRequest;
    await listener({ ...event, request: otherRequest });
    expect(enqueueReconciliation).toHaveBeenCalledWith({
      sourceId: source.id,
      sourceSlug: source.slug,
      request: otherRequest,
    });
    expect(ensurePeriodicReconciliation).toHaveBeenCalledWith(otherRequest);
  });

  it('retains queued cleanup when periodic recovery setup fails', async () => {
    const { listener, enqueueReconciliation, ensurePeriodicReconciliation } = setup();
    ensurePeriodicReconciliation.mockRejectedValue(new Error('workflow installation unavailable'));
    await expect(listener({ type: 'created', source, request })).rejects.toThrow(
      'workflow installation unavailable'
    );
    expect(enqueueReconciliation).toHaveBeenCalledTimes(1);
  });

  it('enables periodic recovery when enqueueing the immediate job fails', async () => {
    const { listener, enqueueReconciliation, ensurePeriodicReconciliation } = setup();
    enqueueReconciliation.mockRejectedValue(new Error('queue unavailable'));
    await expect(listener({ type: 'created', source, request })).rejects.toThrow(
      'queue unavailable'
    );
    expect(ensurePeriodicReconciliation).toHaveBeenCalledWith(request);
  });

  it('ignores title changes that preserve the query and enabled flag', async () => {
    const { listener, enqueueReconciliation, ensurePeriodicReconciliation } = setup();
    await listener({
      type: 'updated',
      source: { ...source, title: 'Renamed' },
      previous: source,
      request,
    });
    expect(enqueueReconciliation).not.toHaveBeenCalled();
    expect(ensurePeriodicReconciliation).not.toHaveBeenCalled();
  });
});

describe('durable source revision reconciliation', () => {
  const setup = () => {
    const source = makeSource({ id: 'source', esql_updated_at: 'revision-2' });
    const state: Parameters<Parameters<SourceKnowledgeStateClient['runExclusive']>[0]['run']>[0] = {
      revision: 'revision-1',
      onboardingScheduled: true,
      lease: null,
    };
    const checkpoint = jest.fn(async (patch: Partial<typeof state>) => {
      Object.assign(state, patch);
    });
    const sourceKnowledgeState: SourceKnowledgeStateClient = {
      runExclusive: jest.fn(async ({ run }) => run({ ...state }, checkpoint)),
      write: jest.fn(),
    };
    const scheduleSourceOnboarding = jest.fn(async () => true);
    const kiClient = makeKiClient();
    const onboardingClient = {
      cancelBySource: jest.fn(async () => null),
      getNonTerminalExecutions: jest.fn().mockResolvedValue([]),
    };
    const sourcesClient = { get: jest.fn(async () => ({ source })) } as unknown as SourcesClient;
    const reconcile = () =>
      reconcileSourceRevision({
        source,
        sourcesClient,
        kiClient,
        onboardingClient,
        sourceKnowledgeState,
        scheduleSourceOnboarding,
        request,
      });
    return {
      reconcile,
      source,
      state,
      checkpoint,
      scheduleSourceOnboarding,
      kiClient,
      onboardingClient,
    };
  };

  it('starts onboarding for a new source without deleting knowledge', async () => {
    const { reconcile, state, scheduleSourceOnboarding, kiClient, source } = setup();
    state.revision = undefined;
    state.onboardingScheduled = false;
    await reconcile();
    expect(scheduleSourceOnboarding).toHaveBeenCalledWith(source);
    expect(kiClient.deleteIndicators).not.toHaveBeenCalled();
    expect(state.revision).toBe('revision-2');
  });

  it('retries failed cleanup before scheduling the replacement exactly once', async () => {
    const { reconcile, state, kiClient, scheduleSourceOnboarding } = setup();
    kiClient.deleteIndicators.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(reconcile()).rejects.toThrow('storage unavailable');
    expect(state.revision).toBe('revision-1');
    expect(scheduleSourceOnboarding).not.toHaveBeenCalled();
    await reconcile();
    await reconcile();
    expect(kiClient.deleteIndicators).toHaveBeenCalledTimes(2);
    expect(scheduleSourceOnboarding).toHaveBeenCalledTimes(1);
    expect(state).toEqual({ revision: 'revision-2', onboardingScheduled: true, lease: null });
  });

  it('waits for cancellation to complete before queuing the replacement', async () => {
    const { reconcile, state, onboardingClient, scheduleSourceOnboarding, kiClient } = setup();
    onboardingClient.getNonTerminalExecutions.mockResolvedValueOnce([
      runningExecution('source-slug'),
    ]);
    await expect(reconcile()).rejects.toThrow('previous onboarding');
    expect(state.onboardingScheduled).toBe(false);
    expect(scheduleSourceOnboarding).not.toHaveBeenCalled();
    await reconcile();
    expect(scheduleSourceOnboarding).toHaveBeenCalledTimes(1);
    expect(kiClient.deleteIndicators).toHaveBeenCalledTimes(1);
  });

  it('retries a failed enqueue without deleting the cleaned revision again', async () => {
    const { reconcile, state, scheduleSourceOnboarding, kiClient } = setup();
    scheduleSourceOnboarding.mockRejectedValueOnce(new Error('queue unavailable'));
    await expect(reconcile()).rejects.toThrow('queue unavailable');
    expect(state.onboardingScheduled).toBe(false);
    await reconcile();
    expect(scheduleSourceOnboarding).toHaveBeenCalledTimes(2);
    expect(kiClient.deleteIndicators).toHaveBeenCalledTimes(1);
  });

  it('leaves onboarding pending when continuous onboarding is off', async () => {
    const { reconcile, state, scheduleSourceOnboarding } = setup();
    scheduleSourceOnboarding.mockResolvedValue(false);
    await reconcile();
    expect(state.onboardingScheduled).toBe(false);
  });
});
