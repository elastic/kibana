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
import type { SignificantEventsMaintenanceState } from '../../../../common/maintenance/state_machine';
import type { GetScopedClients } from '../../types';
import {
  createSourceChangeListener,
  reconcileSourceCatalog,
  resetSourceKnowledge,
} from './reconcile_source_catalog';

const request = { spaceId: 'default' } as KibanaRequest;

const runningExecution = (sourceSlug: string) => ({
  status: ExecutionStatus.RUNNING,
  concurrencyGroupKey: `nightshift-source-onboarding-${sourceSlug}`,
});

const makeSource = (
  overrides: Partial<NightshiftSource> & Pick<NightshiftSource, 'id'>
): NightshiftSource => ({
  title: overrides.id,
  description: '',
  tags: [],
  esql: 'FROM logs-*',
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
  findStreamNamesWithOwnedRules: jest.fn().mockResolvedValue(ownedRuleIds),
  getStreamNamesToReconcile: jest.fn().mockResolvedValue(reconcileIds),
  deleteOwnedRules: jest.fn().mockResolvedValue(undefined),
  deleteAllQueries: jest.fn().mockResolvedValue(undefined),
  deleteIndicators: jest.fn().mockResolvedValue(undefined),
});

describe('reconcileSourceCatalog', () => {
  const cancelBySourceSlug = jest.fn().mockResolvedValue(null);
  const onboardingWithRuns = (sourceSlugs: string[]) => ({
    cancelBySourceSlug,
    getNonTerminalExecutions: jest.fn().mockResolvedValue(sourceSlugs.map(runningExecution)),
  });

  beforeEach(() => {
    cancelBySourceSlug.mockClear();
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

    expect(cancelBySourceSlug).toHaveBeenCalledWith({
      sourceSlug: 'disabled-source-slug',
      request,
    });
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('disabled-source', false);
    expect(cancelBySourceSlug.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.setSourceRulesEnabled.mock.invocationCallOrder[0]
    );
    expect(kiClient.deleteOwnedRules).not.toHaveBeenCalled();
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
    expect(cancelBySourceSlug).not.toHaveBeenCalled();
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
    expect(cancelBySourceSlug).toHaveBeenCalledWith({
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
    expect(cancelBySourceSlug).not.toHaveBeenCalled();
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

    expect(cancelBySourceSlug).toHaveBeenCalledWith({
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

    expect(cancelBySourceSlug).not.toHaveBeenCalled();
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

  it('cancels a running execution whose slug has no catalog row', async () => {
    const kiClient = makeKiClient([]);
    await reconcileSourceCatalog({
      sourcesClient: makeSourcesClient([makeSource({ id: 'enabled-source' })]),
      kiClient,
      onboardingClient: onboardingWithRuns(['gone-source-slug', 'enabled-source-slug']),
      maintenanceService: { getState: jest.fn().mockResolvedValue('enabled') },
      request,
    });

    expect(cancelBySourceSlug).toHaveBeenCalledTimes(1);
    expect(cancelBySourceSlug).toHaveBeenCalledWith({ sourceSlug: 'gone-source-slug', request });
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

    expect(cancelBySourceSlug).toHaveBeenCalledWith({ sourceSlug: 'gone-source-slug', request });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('gone-source');
    expect(cancelBySourceSlug.mock.invocationCallOrder[0]).toBeLessThan(
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

    expect(cancelBySourceSlug).toHaveBeenCalledWith({
      sourceSlug: 'gone-source-slug',
      request: otherRequest,
    });
  });
});

describe('resetSourceKnowledge', () => {
  it('cancels the onboarding run by slug before dropping rules, queries and indicators', async () => {
    const kiClient = makeKiClient();
    const cancelBySourceSlug = jest.fn().mockResolvedValue(null);

    await resetSourceKnowledge({
      source: { id: 'source-1', slug: 'nginx-errors' },
      kiClient,
      onboardingClient: { cancelBySourceSlug },
      request,
    });

    expect(cancelBySourceSlug).toHaveBeenCalledWith({ sourceSlug: 'nginx-errors', request });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteAllQueries).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('source-1');
    expect(cancelBySourceSlug.mock.invocationCallOrder[0]).toBeLessThan(
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
    const cancelBySourceSlug = jest.fn().mockRejectedValue(new Error('no workflows privilege'));

    await expect(
      resetSourceKnowledge({
        source: { id: 'source-1', slug: 'nginx-errors' },
        kiClient,
        onboardingClient: { cancelBySourceSlug },
        request,
      })
    ).rejects.toThrow('no workflows privilege');

    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('source-1');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('source-1');
  });
});

describe('createSourceChangeListener', () => {
  const setup = ({
    maintenanceState = 'enabled',
  }: { maintenanceState?: SignificantEventsMaintenanceState } = {}) => {
    const kiClient = makeKiClient();
    const getScopedClients = jest.fn().mockResolvedValue({
      getKnowledgeIndicatorClient: jest.fn().mockResolvedValue(kiClient),
    });
    const cancelBySourceSlug = jest.fn().mockResolvedValue(null);
    const maintenanceService = { getState: jest.fn().mockResolvedValue(maintenanceState) };
    const listener = createSourceChangeListener({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      onboardingClient: { cancelBySourceSlug },
      maintenanceService,
    });
    return { listener, kiClient, getScopedClients, cancelBySourceSlug };
  };

  const source = makeSource({ id: 'gone-source' });
  const enabledSource = makeSource({ id: 'toggled-source', enabled: true });
  const disabledSource = makeSource({ id: 'toggled-source', enabled: false });

  it('resets the knowledge of a deleted source in the space of the deleting request', async () => {
    const { listener, kiClient, getScopedClients, cancelBySourceSlug } = setup();
    const otherRequest = { spaceId: 'other' } as KibanaRequest;

    await listener({ type: 'deleted', source, request: otherRequest });

    expect(getScopedClients).toHaveBeenCalledWith({ request: otherRequest });
    expect(cancelBySourceSlug).toHaveBeenCalledWith({
      sourceSlug: 'gone-source-slug',
      request: otherRequest,
    });
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('gone-source');
  });

  it('cancels onboarding, then disables the owned rules of a disabled source', async () => {
    const { listener, kiClient, cancelBySourceSlug } = setup();

    await listener({
      type: 'updated',
      source: disabledSource,
      previous: enabledSource,
      request,
    });

    expect(cancelBySourceSlug).toHaveBeenCalledWith({
      sourceSlug: 'toggled-source-slug',
      request,
    });
    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('toggled-source', false);
    expect(cancelBySourceSlug.mock.invocationCallOrder[0]).toBeLessThan(
      kiClient.setSourceRulesEnabled.mock.invocationCallOrder[0]
    );
    expect(kiClient.deleteIndicators).not.toHaveBeenCalled();
  });

  it('disables the rules of a disabled source even when cancelling its run fails', async () => {
    const { listener, kiClient, cancelBySourceSlug } = setup();
    cancelBySourceSlug.mockRejectedValue(new Error('no workflows privilege'));

    await expect(
      listener({ type: 'updated', source: disabledSource, previous: enabledSource, request })
    ).rejects.toThrow('no workflows privilege');

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('toggled-source', false);
  });

  it('enables the owned rules of a re-enabled source without touching onboarding', async () => {
    const { listener, kiClient, cancelBySourceSlug } = setup();

    await listener({
      type: 'updated',
      source: enabledSource,
      previous: disabledSource,
      request,
    });

    expect(kiClient.setSourceRulesEnabled).toHaveBeenCalledWith('toggled-source', true);
    expect(cancelBySourceSlug).not.toHaveBeenCalled();
  });

  it('keeps the rules of a re-enabled source off while maintenance is paused', async () => {
    const { listener, kiClient } = setup({ maintenanceState: 'paused' });

    await listener({
      type: 'updated',
      source: enabledSource,
      previous: disabledSource,
      request,
    });

    expect(kiClient.setSourceRulesEnabled).not.toHaveBeenCalled();
  });

  it('resets the knowledge of a source whose query changed', async () => {
    const { listener, kiClient, cancelBySourceSlug } = setup();
    const edited = { ...enabledSource, esql_updated_at: '2026-02-01T00:00:00.000Z' };

    await listener({ type: 'updated', source: edited, previous: enabledSource, request });

    expect(cancelBySourceSlug).toHaveBeenCalledWith({ sourceSlug: 'toggled-source-slug', request });
    expect(kiClient.deleteOwnedRules).toHaveBeenCalledWith('toggled-source');
    expect(kiClient.deleteIndicators).toHaveBeenCalledWith('toggled-source');
    expect(kiClient.setSourceRulesEnabled).not.toHaveBeenCalled();
  });

  it('ignores created sources and updates that keep the enabled flag', async () => {
    const { listener, getScopedClients } = setup();
    const events: SourceChangeEvent[] = [
      { type: 'created', source, request },
      {
        type: 'updated',
        source: { ...enabledSource, title: 'Renamed' },
        previous: enabledSource,
        request,
      },
    ];

    for (const event of events) {
      await listener(event);
    }

    expect(getScopedClients).not.toHaveBeenCalled();
  });
});
