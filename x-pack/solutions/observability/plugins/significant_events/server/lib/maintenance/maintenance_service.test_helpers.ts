/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import { loggerMock } from '@kbn/logging-mocks';
import type { DeleteAllInvestigationsResult } from '@kbn/nightshift-investigations-plugin/server';
import type { GetScopedClients } from '../../routes/types';
import type { SignificantEventsServer } from '../../types';
import type { KnowledgeIndicatorType } from '../knowledge_indicators';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { EVENTS_DATA_STREAM } from '../significant_events/events/data_stream';
import { createSignificantEventsMaintenanceService } from './maintenance_service';

export const REQUEST = { headers: {} } as KibanaRequest;
// The credential-less request system sweeps build for themselves.
export const SYSTEM_REQUEST = expect.objectContaining({
  isFakeRequest: true,
  auth: { isAuthenticated: false },
});

// A minimal, stateful saved-objects client: `get` throws NotFound until `create`
// stores the doc, then returns it with a version that every write bumps. `create`
// without overwrite and `update` with a stale version throw a conflict, like ES.
export function makeSoClient() {
  const store = new Map<string, { attributes: Record<string, unknown>; version?: string }>();
  const key = (type: string, id: string) => `${type}:${id}`;
  let nextVersion = 1;
  const put = (type: string, id: string, attributes: Record<string, unknown>) =>
    store.set(key(type, id), { attributes, version: String(nextVersion++) });
  return {
    get: jest.fn(async (type: string, id: string) => {
      const stored = store.get(key(type, id));
      if (!stored) {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      }
      return { id, type, references: [], ...stored };
    }),
    create: jest.fn(
      async (
        type: string,
        attributes: Record<string, unknown>,
        options: { id: string; overwrite?: boolean }
      ) => {
        if (options.overwrite === false && store.has(key(type, options.id))) {
          throw SavedObjectsErrorHelpers.createConflictError(type, options.id);
        }
        put(type, options.id, attributes);
        return { id: options.id, type, references: [], attributes };
      }
    ),
    update: jest.fn(
      async (
        type: string,
        id: string,
        attributes: Record<string, unknown>,
        options?: { version?: string }
      ) => {
        const stored = store.get(key(type, id));
        if (!stored) {
          throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
        }
        if (options?.version !== undefined && options.version !== stored.version) {
          throw SavedObjectsErrorHelpers.createConflictError(type, id);
        }
        put(type, id, { ...stored.attributes, ...attributes });
        return { id, type, references: [], attributes };
      }
    ),
  };
}

// Stateful workflows management mock: tracks each workflow's `enabled` flag so a
// pause→resume round-trip reads back what the previous step wrote.
export function makeManagementApi(options?: {
  failUpdateFor?: string;
  /** Static id, or a mutable `{ id }` so a later resume can clear the failure. */
  failEnableFor?: string | { id?: string };
  /** Workflow ids for which cancelAllActiveWorkflowExecutions should throw. */
  failCancelAllFor?: string;
}) {
  const enabled = new Map<string, boolean>();
  const stateKey = (id: string, spaceId: string) => `${id}@${spaceId}`;
  const failEnableId = (): string | undefined =>
    typeof options?.failEnableFor === 'object' ? options.failEnableFor.id : options?.failEnableFor;

  const getWorkflow = jest.fn(async (id: string, spaceId: string) => ({
    id,
    enabled: enabled.get(stateKey(id, spaceId)) ?? true,
    definition: { id },
  }));

  const updateWorkflow = jest.fn(
    async (id: string, patch: { enabled?: boolean }, spaceId: string) => {
      if (options?.failUpdateFor === id) {
        throw new Error(`update failed for ${id}`);
      }
      if (failEnableId() === id && patch.enabled === true) {
        throw new Error(`enable failed for ${id}`);
      }
      enabled.set(stateKey(id, spaceId), patch.enabled ?? true);
      return {
        id,
        enabled: patch.enabled,
        validationErrors: [] as string[],
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: 'system',
        valid: true,
      };
    }
  );

  const cancelAllActiveWorkflowExecutions = jest.fn(
    async (workflowId: string, _spaceId: string, _request: unknown) => {
      if (options?.failCancelAllFor === workflowId) {
        throw new Error(`cancel-all failed for ${workflowId}`);
      }
      return undefined;
    }
  );

  return {
    api: {
      getWorkflow,
      updateWorkflow,
      cancelAllActiveWorkflowExecutions,
      getClient: jest.fn(() => ({ getWorkflow })),
    },
    getWorkflow,
    updateWorkflow,
    cancelAllActiveWorkflowExecutions,
  };
}

export interface BulkError {
  id: string;
  error: { code: string; message: string };
}

// Alerting v2 rules client stub. Records the ids each call received and returns
// the configured per-id errors (empty = all succeeded).
export function makeV2RulesClient(options?: {
  disableErrors?: BulkError[];
  enableErrors?: BulkError[];
  deleteErrors?: BulkError[];
}) {
  const bulkDisableRules = jest.fn(async (_params: { ids: string[] }) => ({
    errors: options?.disableErrors ?? [],
  }));
  const bulkEnableRules = jest.fn(async (_params: { ids: string[] }) => ({
    errors: options?.enableErrors ?? [],
  }));
  const bulkDeleteRules = jest.fn(async ({ ids }: { ids: string[] }) => ({
    affected_count: ids.length - (options?.deleteErrors?.length ?? 0),
    errors: options?.deleteErrors ?? [],
  }));
  return { bulkDisableRules, bulkEnableRules, bulkDeleteRules };
}

export function makeUiSettingsClient(
  initial: Record<string, boolean | number | string> = {},
  options?: { failSetFor?: string }
) {
  const store = new Map<string, boolean | number | string>(Object.entries(initial));
  return {
    get: jest.fn(async <T>(key: string, defaultValue?: T) =>
      store.has(key) ? (store.get(key) as T) : defaultValue
    ),
    set: jest.fn(async (key: string, value: boolean | number | string) => {
      if (options?.failSetFor === key) {
        throw new Error(`set failed for ${key}`);
      }
      store.set(key, value);
    }),
    getAll: jest.fn(async () => Object.fromEntries(store)),
    _store: store,
  };
}

export function makeService(params?: {
  management?: ReturnType<typeof makeManagementApi>['api'];
  ruleBackedRuleIds?: string[];
  v2RulesClient?: ReturnType<typeof makeV2RulesClient> | null;
  spacesGetAllThrows?: boolean;
  /** Space ids returned by SpacesClient.getAll (default: default only). */
  spaceIds?: string[];
  /** Space ids the internal client finds (default: same as `spaceIds`). */
  internalSpaceIds?: string[];
  /** Global continuous-onboarding toggle before pause (default: off). */
  continuousOnboardingEnabled?: boolean;
  /** Per-space scheduled-discovery toggle before pause (default: off). */
  scheduledDiscoveryEnabled?: boolean;
  /** Make the continuous-onboarding uiSettings `set` throw. */
  failContinuousSet?: boolean;
  /** Make the scheduled-discovery uiSettings `set` throw. */
  failScheduledSet?: boolean;
  indicatorStreams?: string[];
  ownedRuleStreams?: string[];
  queryLinksByStream?: Record<string, Array<{ rule_backed: boolean; rule_id?: string }>>;
  knowledgeIndicatorCounts?: Partial<Record<KnowledgeIndicatorType, number>>;
  ownedRuleIdsByStream?: Record<string, string[]>;
  dataStreams?: Record<string, number>;
  /** `null` models the investigations plugin being unavailable. */
  investigations?: DeleteAllInvestigationsResult | null;
}) {
  const soClient = makeSoClient();
  // `null` models the alerting v2 plugin being unavailable.
  const v2RulesClient =
    params?.v2RulesClient === null ? undefined : params?.v2RulesClient ?? makeV2RulesClient();
  const getRuleBackedQueryLinks = jest.fn(async () =>
    (params?.ruleBackedRuleIds ?? []).map((rule_id) => ({ rule_id }))
  );
  const getStreamNamesWithKnowledgeIndicators = jest.fn(async () => params?.indicatorStreams ?? []);
  const findStreamNamesWithOwnedRules = jest.fn(async () => params?.ownedRuleStreams ?? []);
  const getStreamToQueryLinksMap = jest.fn(async (streamNames: string[]) =>
    Object.fromEntries(
      streamNames.map((streamName) => [streamName, params?.queryLinksByStream?.[streamName] ?? []])
    )
  );
  const countKnowledgeIndicators = jest.fn(
    async (type: KnowledgeIndicatorType) => params?.knowledgeIndicatorCounts?.[type] ?? 0
  );
  const findOwnedRuleIds = jest.fn(
    async (streamName: string) => params?.ownedRuleIdsByStream?.[streamName] ?? []
  );

  const streamDocuments = new Map<string, number>(
    Object.entries(
      params?.dataStreams ?? {
        [DETECTIONS_DATA_STREAM]: 0,
        [EVENTS_DATA_STREAM]: 0,
        [KNOWLEDGE_INDICATORS_DATA_STREAM]: 0,
      }
    )
  );
  // The caller's client refreshes and deletes (`kibana_system` lacks `maintenance` and
  // `delete_index`); `createDataStream` is a sentinel that must stay uncalled.
  const esClient = {
    indices: {
      deleteDataStream: jest.fn(async ({ name }: { name: string }) => {
        streamDocuments.delete(name);
        return { acknowledged: true };
      }),
      refresh: jest.fn(async () => ({})),
      createDataStream: jest.fn(async ({ name }: { name: string }) => {
        streamDocuments.set(name, 0);
        return { acknowledged: true };
      }),
    },
  };
  // Exists, count and create run as `kibana_system`.
  const internalEsClient = {
    indices: {
      exists: jest.fn(async ({ index }: { index: string }) => streamDocuments.has(index)),
      createDataStream: jest.fn(async ({ name }: { name: string }) => {
        streamDocuments.set(name, 0);
        return { acknowledged: true };
      }),
    },
    count: jest.fn(async ({ index }: { index: string }) => ({
      count: streamDocuments.get(index) ?? 0,
    })),
  };
  const initializeClient = jest.fn(async (_name: string) => ({}));
  const asScoped = jest.fn(() => ({ asCurrentUser: esClient }));
  const investigations =
    params?.investigations === null
      ? undefined
      : params?.investigations ?? {
          investigationData: {
            investigations: 0,
            subjects: 0,
            subjectClaims: 0,
            impact: 0,
            hypotheses: 0,
          },
        };
  const deleteAllInvestigations = investigations ? jest.fn(async () => investigations) : undefined;

  const globalUiSettingsClient = makeUiSettingsClient(
    {
      [OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED]:
        params?.continuousOnboardingEnabled ?? false,
    },
    params?.failContinuousSet
      ? { failSetFor: OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED }
      : undefined
  );
  const spaceUiSettingsClient = makeUiSettingsClient(
    {
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]:
        params?.scheduledDiscoveryEnabled ?? false,
    },
    params?.failScheduledSet
      ? { failSetFor: OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED }
      : undefined
  );

  // One space per page, so a sweep that stops after the first page misses `space-a`.
  const spacesRepository = {
    createPointInTimeFinder: jest.fn(() => ({
      async *find() {
        for (const id of params?.internalSpaceIds ?? params?.spaceIds ?? ['default']) {
          yield { saved_objects: [{ id }] };
        }
      },
      close: jest.fn(),
    })),
  };
  // System sweeps scope Settings per space, so each space gets its own client and a
  // mis-scoped write shows up. User-scoped paths keep the shared `spaceUiSettingsClient`.
  const internalSpaceUiSettingsClients = new Map<string, typeof spaceUiSettingsClient>();
  const getInternalSpaceUiSettingsClient = (spaceId: string) => {
    const existing = internalSpaceUiSettingsClients.get(spaceId);
    if (existing) {
      return existing;
    }
    const client = makeUiSettingsClient({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]:
        params?.scheduledDiscoveryEnabled ?? false,
    });
    internalSpaceUiSettingsClients.set(spaceId, client);
    return client;
  };
  const internalClient = { asScopedToNamespace: jest.fn((spaceId: string) => ({ spaceId })) };

  const savedObjects = {
    createInternalRepository: jest.fn((types: string[]) =>
      types.includes('space') ? spacesRepository : soClient
    ),
    getScopedClient: jest.fn(),
    getUnsafeInternalClient: jest.fn(() => internalClient),
  };

  const server = {
    core: {
      savedObjects,
      dataStreams: { initializeClient },
      elasticsearch: {
        client: {
          asScoped,
          asInternalUser: internalEsClient,
        },
      },
      uiSettings: {
        asScopedToClient: jest.fn((client?: { spaceId?: string }) =>
          client?.spaceId ? getInternalSpaceUiSettingsClient(client.spaceId) : spaceUiSettingsClient
        ),
        globalAsScopedToClient: jest.fn(() => globalUiSettingsClient),
      },
    },
    workflowsManagement: params?.management ? { management: params.management } : undefined,
    nightshiftInvestigations: deleteAllInvestigations ? { deleteAllInvestigations } : undefined,
    spaces: {
      spacesService: {
        createSpacesClient: jest.fn(() => ({
          getAll: jest.fn(async () => {
            if (params?.spacesGetAllThrows) {
              throw new Error('spaces unavailable');
            }
            return (params?.spaceIds ?? ['default']).map((id) => ({ id }));
          }),
        })),
      },
    },
  } as unknown as SignificantEventsServer;

  const getScopedClients = jest.fn(async () => ({
    getKnowledgeIndicatorClient: async () => ({
      getRuleBackedQueryLinks,
      getStreamNamesWithKnowledgeIndicators,
      findStreamNamesWithOwnedRules,
      countKnowledgeIndicators,
      getStreamToQueryLinksMap,
      findOwnedRuleIds,
    }),
    getSignificantEventsAlertingContext: async () => ({ alertingV2RulesClient: v2RulesClient }),
    globalUiSettingsClient,
    uiSettingsClient: spaceUiSettingsClient,
  }));

  const service = createSignificantEventsMaintenanceService({
    logger: loggerMock.create(),
    server,
    getScopedClients: getScopedClients as unknown as GetScopedClients,
  });

  return {
    service,
    soClient,
    savedObjects,
    getScopedClients,
    v2RulesClient,
    getRuleBackedQueryLinks,
    getStreamNamesWithKnowledgeIndicators,
    findStreamNamesWithOwnedRules,
    countKnowledgeIndicators,
    getStreamToQueryLinksMap,
    findOwnedRuleIds,
    initializeClient,
    internalEsClient,
    streamDocuments,
    esClient,
    asScoped,
    deleteAllInvestigations,
    globalUiSettingsClient,
    spaceUiSettingsClient,
    getInternalSpaceUiSettingsClient,
  };
}
