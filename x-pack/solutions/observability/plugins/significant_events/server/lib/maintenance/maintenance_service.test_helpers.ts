/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { asSpaceId, brandSpaceId } from '@kbn/core-spaces-common';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import {
  SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { loggerMock } from '@kbn/logging-mocks';
import type { GetScopedClients } from '../../routes/types';
import type { SignificantEventsServer } from '../../types';
import type { KnowledgeIndicatorType } from '../knowledge_indicators';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { createSignificantEventsMaintenanceService } from './maintenance_service';
import { requestForSpace } from './feature_settings';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
} from './saved_object';

export const REQUEST = { headers: {}, spaceId: asSpaceId('default') } as KibanaRequest;
/** A request made in another space, with the caller's credentials. */
export const requestInSpace = (spaceId: string): KibanaRequest =>
  requestForSpace(REQUEST, brandSpaceId(spaceId));
// The credential-less request system sweeps build for themselves.
export const SYSTEM_REQUEST = expect.objectContaining({
  isFakeRequest: true,
  auth: { isAuthenticated: false },
});

/** The per-space continuous onboarding document of a space. */
export const continuousDocumentId = (spaceId: string): string =>
  `${SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID}-${spaceId}`;

/** The per-space cleanup document of a space: scheduled, and not backed by a Settings toggle. */
export const cleanupDocumentId = (spaceId: string): string =>
  `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-${spaceId}`;

/** The space a saved-objects call was scoped to; it travels as `this` (see `mock.contexts`). */
interface SoCallContext {
  spaceId: string;
}

// A minimal, stateful saved-objects client of a space-isolated type: every space has its own
// document under the same id. `get` throws NotFound until `create` stores the doc, then returns
// it with a version that every write bumps. `create` without overwrite and `update` with a stale
// version throw a conflict, like ES.
//
// The calls are recorded on shared mocks, in the shape the real client takes, so a test sees
// every write in order whichever space made it. `forSpace` is what `asScopedToNamespace` hands
// out; `readDocument` and `seed` reach a space's stored document directly.
export function makeSoClient() {
  const store = new Map<string, { attributes: Record<string, unknown>; version?: string }>();
  const key = (spaceId: string, type: string, id: string) => `${spaceId}:${type}:${id}`;
  let nextVersion = 1;
  const put = (spaceId: string, type: string, id: string, attributes: Record<string, unknown>) =>
    store.set(key(spaceId, type, id), { attributes, version: String(nextVersion++) });

  const get = jest.fn(async function (this: SoCallContext, type: string, id: string) {
    const stored = store.get(key(this.spaceId, type, id));
    if (!stored) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return { id, type, references: [], ...stored };
  });
  const create = jest.fn(async function (
    this: SoCallContext,
    type: string,
    attributes: Record<string, unknown>,
    options: { id: string; overwrite?: boolean }
  ) {
    if (options.overwrite === false && store.has(key(this.spaceId, type, options.id))) {
      throw SavedObjectsErrorHelpers.createConflictError(type, options.id);
    }
    put(this.spaceId, type, options.id, attributes);
    return { id: options.id, type, references: [], attributes };
  });
  const update = jest.fn(async function (
    this: SoCallContext,
    type: string,
    id: string,
    attributes: Record<string, unknown>,
    options?: { version?: string }
  ) {
    const stored = store.get(key(this.spaceId, type, id));
    if (!stored) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    if (options?.version !== undefined && options.version !== stored.version) {
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    }
    put(this.spaceId, type, id, { ...stored.attributes, ...attributes });
    return { id, type, references: [], attributes };
  });
  const remove = jest.fn(async function (this: SoCallContext, type: string, id: string) {
    if (!store.delete(key(this.spaceId, type, id))) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    }
    return {};
  });

  const forSpace = (spaceId: string) => {
    const context: SoCallContext = { spaceId };
    return {
      spaceId,
      get: (...args: Parameters<typeof get>) => get.call(context, ...args),
      create: (...args: Parameters<typeof create>) => create.call(context, ...args),
      update: (...args: Parameters<typeof update>) => update.call(context, ...args),
      delete: (...args: Parameters<typeof remove>) => remove.call(context, ...args),
    };
  };

  /** The stored maintenance document of a space, if any. */
  const readDocument = (spaceId: string) =>
    store.get(
      key(
        spaceId,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
        SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
      )
    )?.attributes;

  /** Stores a maintenance document as is, e.g. one written while the type was still agnostic. */
  const seed = (spaceId: string, attributes: Record<string, unknown>) =>
    put(
      spaceId,
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
      attributes
    );

  return { get, create, update, delete: remove, forSpace, readDocument, seed };
}

// Stateful workflows management mock: tracks each workflow's `enabled` flag so a
// pause→resume round-trip reads back what the previous step wrote.
export function makeManagementApi(options?: {
  failUpdateFor?: string;
  /** Static id, or a mutable `{ id }` so a later resume can clear the failure. */
  failEnableFor?: string | { id?: string };
  /** Workflow ids for which cancelAllActiveWorkflowExecutions should throw. */
  failCancelAllFor?: string;
  /**
   * Document ids that are not installed. Per-space continuous onboarding documents
   * only exist while the feature is on in their space.
   */
  missingWorkflows?: string[];
}) {
  const enabled = new Map<string, boolean>();
  const stateKey = (id: string, spaceId: string) => `${id}@${spaceId}`;
  const failEnableId = (): string | undefined =>
    typeof options?.failEnableFor === 'object' ? options.failEnableFor.id : options?.failEnableFor;
  const missing = new Set(options?.missingWorkflows ?? []);

  const getWorkflow = jest.fn(async (id: string, spaceId: string) =>
    missing.has(id)
      ? null
      : {
          id,
          enabled: enabled.get(stateKey(id, spaceId)) ?? true,
          definition: { id },
        }
  );

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
  options?: { failSetFor?: string[] }
) {
  const store = new Map<string, boolean | number | string>(Object.entries(initial));
  return {
    get: jest.fn(async <T>(key: string, defaultValue?: T) =>
      store.has(key) ? (store.get(key) as T) : defaultValue
    ),
    set: jest.fn(async (key: string, value: boolean | number | string) => {
      if (options?.failSetFor?.includes(key)) {
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
  /** Rule ids whose owning source is disabled in the catalog; the others belong to an enabled one. */
  disabledSourceRuleIds?: string[];
  v2RulesClient?: ReturnType<typeof makeV2RulesClient> | null;
  spacesGetAllThrows?: boolean;
  /** Space ids returned by SpacesClient.getAll (default: default only). */
  spaceIds?: string[];
  /** Space ids the internal client finds (default: same as `spaceIds`). */
  internalSpaceIds?: string[];
  /** Make the internal client's space finder throw. */
  internalSpacesThrow?: boolean;
  /** Per-space continuous-onboarding toggle before pause, in every space (default: off). */
  continuousOnboardingEnabled?: boolean;
  /** Per-space scheduled-discovery toggle before pause (default: off). */
  scheduledDiscoveryEnabled?: boolean;
  /** Make the continuous-onboarding uiSettings `set` throw. */
  failContinuousSet?: boolean;
  /** Make the scheduled-discovery uiSettings `set` throw. */
  failScheduledSet?: boolean;
  indicatorStreams?: string[];
  ownedRuleStreams?: string[];
  queryLinksBySource?: Record<string, Array<{ rule_backed: boolean; rule_id?: string }>>;
  knowledgeIndicatorCounts?: Partial<Record<KnowledgeIndicatorType, number>>;
  ownedRuleIdsBySource?: Record<string, string[]>;
  dataStreams?: Record<string, number>;
  /** `null` models the investigations plugin being unavailable. */
  investigations?: {
    deleted: number;
    failures: Array<{ id: string; spaceId: string; error: string }>;
  } | null;
}) {
  const soClient = makeSoClient();
  // `null` models the alerting v2 plugin being unavailable.
  const v2RulesClient =
    params?.v2RulesClient === null ? undefined : params?.v2RulesClient ?? makeV2RulesClient();
  const getRuleBackedQueryLinks = jest.fn(async () =>
    (params?.ruleBackedRuleIds ?? []).map((rule_id) => ({
      rule_id,
      source_id: params?.disabledSourceRuleIds?.includes(rule_id)
        ? 'disabled-source'
        : 'enabled-source',
    }))
  );
  const sourcesClient = {
    list: jest.fn(async ({ enabled }: { enabled?: boolean }) => {
      const sources = enabled === false ? [{ id: 'disabled-source' }] : [{ id: 'enabled-source' }];
      return { sources, total: sources.length };
    }),
  };
  const getSourceIdsWithKnowledgeIndicators = jest.fn(async () => params?.indicatorStreams ?? []);
  const findSourceIdsWithOwnedRules = jest.fn(async () => params?.ownedRuleStreams ?? []);
  const getSourceToQueryLinksMap = jest.fn(async (sourceIds: string[]) =>
    Object.fromEntries(
      sourceIds.map((sourceId) => [sourceId, params?.queryLinksBySource?.[sourceId] ?? []])
    )
  );
  const countKnowledgeIndicators = jest.fn(
    async (type: KnowledgeIndicatorType) => params?.knowledgeIndicatorCounts?.[type] ?? 0
  );
  const findOwnedRuleIds = jest.fn(
    async (sourceId: string) => params?.ownedRuleIdsBySource?.[sourceId] ?? []
  );

  const streamDocuments = new Map<string, number>(
    Object.entries(
      params?.dataStreams ?? {
        [DETECTIONS_DATA_STREAM]: 0,
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
      : params?.investigations ?? { deleted: 0, failures: [] };
  const deleteAllInvestigations = investigations ? jest.fn(async () => investigations) : undefined;

  const initialSettings = {
    [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]:
      params?.continuousOnboardingEnabled ?? false,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]:
      params?.scheduledDiscoveryEnabled ?? false,
  };
  const userFailSetFor = [
    ...(params?.failContinuousSet ? [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED] : []),
    ...(params?.failScheduledSet
      ? [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]
      : []),
  ];
  const spaceUiSettingsClient = makeUiSettingsClient(initialSettings, {
    failSetFor: userFailSetFor,
  });

  // One space per page, so a sweep that stops after the first page misses `space-a`.
  const spacesRepository = {
    createPointInTimeFinder: jest.fn(() => ({
      async *find() {
        if (params?.internalSpacesThrow) {
          throw new Error('spaces finder failed');
        }
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
    // System sweeps run reset and reassert, which only write the continuous toggle here.
    const client = makeUiSettingsClient(initialSettings, {
      failSetFor: params?.failContinuousSet
        ? [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]
        : [],
    });
    internalSpaceUiSettingsClients.set(spaceId, client);
    return client;
  };
  // The internal client rebinds to a space: the maintenance document of each space comes from
  // its own scoped client, and the uiSettings client reads the space off the same object.
  const internalClient = {
    asScopedToNamespace: jest.fn((spaceId: string) => soClient.forSpace(spaceId)),
  };

  const savedObjects = {
    // Only the spaces finder goes through a repository. The maintenance document is a
    // space-isolated type, so an unscoped read of it would silently mean the default space.
    createInternalRepository: jest.fn((types: string[]) => {
      if (!types.includes('space')) {
        throw new Error(`Unexpected internal repository for ${types.join(', ')}`);
      }
      return spacesRepository;
    }),
    getScopedClient: jest.fn(),
    getUnsafeInternalClient: jest.fn(() => internalClient),
  };

  // No `globalAsScopedToClient`: continuous onboarding is a space setting, so a
  // leftover global read or write fails the test.
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

  const getScopedClients = jest.fn(async (_params: { request: KibanaRequest }) => ({
    getKnowledgeIndicatorClient: async () => ({
      getRuleBackedQueryLinks,
      getSourceIdsWithKnowledgeIndicators,
      findSourceIdsWithOwnedRules,
      countKnowledgeIndicators,
      getSourceToQueryLinksMap,
      findOwnedRuleIds,
    }),
    getSignificantEventsAlertingContext: async () => ({ alertingV2RulesClient: v2RulesClient }),
    uiSettingsClient: spaceUiSettingsClient,
    sourcesClient,
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
    internalClient,
    getScopedClients,
    v2RulesClient,
    getRuleBackedQueryLinks,
    getSourceIdsWithKnowledgeIndicators,
    findSourceIdsWithOwnedRules,
    countKnowledgeIndicators,
    getSourceToQueryLinksMap,
    findOwnedRuleIds,
    initializeClient,
    internalEsClient,
    streamDocuments,
    esClient,
    asScoped,
    deleteAllInvestigations,
    spaceUiSettingsClient,
    getInternalSpaceUiSettingsClient,
  };
}
