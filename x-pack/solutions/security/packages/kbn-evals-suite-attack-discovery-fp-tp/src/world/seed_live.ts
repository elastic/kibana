/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  AD2_ALERTS_INDEX,
  AD2_SCENARIO_ALL_INDICES,
} from '@kbn/evals-suite-attack-discovery-agent-builder';
import { toAttackAlertDocument } from './attack_alert';
import {
  FP_TP_ATTACK_ADHOC_INDEX,
  FP_TP_ENTITY_READ_ALIAS,
  FP_TP_TWIN_SEED_LABEL,
} from './constants';
import { toEntityCrudRequest } from './entity_crud';
import type { FpTpEntityCrudRequest } from './entity_crud';
import { shiftTwinToNow } from './shift_timestamps';
import type { FpTpGold, FpTpTwin, FpTpWorld } from './types';

export type FpTpLiveKbnRequest = (options: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  version?: string;
}) => Promise<{ statusCode: number; body: unknown }>;

export interface FpTpLiveSeedPlan {
  readonly attackIndex: string;
  readonly attackId: string;
  readonly attackDocument?: Record<string, unknown>;
  readonly alertIds: readonly string[];
  readonly alertOperations: unknown[];
  readonly events: ReadonlyArray<{ index: string; id: string }>;
  readonly eventOperations: unknown[];
  readonly entities: readonly FpTpEntityCrudRequest[];
  /** `host.id` of every seeded alert and event. */
  readonly hostIds: readonly string[];
  /** The world with its timestamps shifted to the seed time, as indexed. */
  readonly world: FpTpWorld;
}

export interface FpTpSeededFixture {
  /** Deletes exactly the documents and entities this seed wrote. */
  readonly cleanup: () => Promise<void>;
  /** The documents as indexed, with timestamps shifted to the seed time. */
  readonly seededWorld: FpTpWorld;
}

export interface FpTpLiveSeedSummary {
  readonly twinId: string;
  readonly attackId: string;
  readonly attackIndex: string;
  readonly alertCount: number;
  readonly eventCount: number;
  readonly entityIds: readonly string[];
  readonly gold: FpTpGold;
}

const ENTITY_API_VERSION = '2023-10-31';
const DETECTION_ENGINE_API_VERSION = '2023-10-31';
const ENTITY_STORE_READY_TIMEOUT_MS = 120_000;
const ENTITY_STORE_POLL_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const assertBulkOk = (label: string, result: { errors?: boolean; items?: unknown[] }): void => {
  if (result.errors !== true) {
    return;
  }
  throw new Error(`${label} bulk had item errors: ${JSON.stringify(result.items)}`);
};

const kbnErrorMessage = (body: unknown): string => {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return JSON.stringify(body);
};

const isNotFound = (statusCode: number): boolean => statusCode === 404;

const isAlreadyExists = (statusCode: number, body: unknown): boolean => {
  if (statusCode === 409) {
    return true;
  }
  return kbnErrorMessage(body).toLowerCase().includes('already exists');
};

export const twinToWorld = (twin: FpTpTwin): FpTpWorld => ({
  attackId: String(twin.attack['kibana.alert.uuid']),
  attack: twin.attack,
  alerts: twin.alerts,
  events: twin.events,
  entities: twin.entities,
});

const hostIdOf = (source: Record<string, unknown>): string | undefined => {
  const { host } = source as { host?: { id?: unknown } };
  return typeof host?.id === 'string' ? host.id : undefined;
};

export const buildLiveSeedPlan = (world: FpTpWorld, now: Date = new Date()): FpTpLiveSeedPlan => {
  const shifted = shiftTwinToNow(world, now);
  const hostIds = new Set(
    [...shifted.alerts, ...shifted.events]
      .map(({ source }) => hostIdOf(source))
      .filter((id): id is string => id !== undefined)
  );

  return {
    attackIndex: FP_TP_ATTACK_ADHOC_INDEX,
    attackId: shifted.attackId,
    attackDocument: shifted.attack ? toAttackAlertDocument(shifted.attack) : undefined,
    alertIds: shifted.alerts.map((alert) => alert.id),
    alertOperations: shifted.alerts.flatMap((alert) => [
      { index: { _index: AD2_ALERTS_INDEX, _id: alert.id } },
      alert.source,
    ]),
    events: shifted.events.map(({ index, id }) => ({ index, id })),
    eventOperations: shifted.events.flatMap((event) => [
      { create: { _index: event.index, _id: event.id } },
      event.source,
    ]),
    entities: shifted.entities.map(toEntityCrudRequest),
    hostIds: [...hostIds],
    world: shifted,
  };
};

const ensureDetectionAlertsIndex = async (kbnRequest: FpTpLiveKbnRequest): Promise<void> => {
  const response = await kbnRequest({
    method: 'POST',
    path: '/api/detection_engine/index',
    version: DETECTION_ENGINE_API_VERSION,
  });
  if (response.statusCode >= 400 && response.statusCode !== 409) {
    throw new Error(
      `Failed to ensure detection alerts index (${response.statusCode}): ${kbnErrorMessage(
        response.body
      )}`
    );
  }
};

const readEntityStoreStatus = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<string | undefined> => {
  const status = await kbnRequest({
    method: 'GET',
    path: '/api/security/entity_store/status',
    version: ENTITY_API_VERSION,
  });
  if (status.statusCode >= 400) {
    return undefined;
  }
  return (status.body as { status?: string } | undefined)?.status;
};

/** Installs the Entity Store if needed and returns its status from before this call. */
const waitForEntityStoreInstalled = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<string | undefined> => {
  const initial = await readEntityStoreStatus(kbnRequest);
  if (initial === 'running' || initial === 'stopped') {
    return initial;
  }

  if (initial !== 'installing') {
    const install = await kbnRequest({
      method: 'POST',
      path: '/api/security/entity_store/install',
      version: ENTITY_API_VERSION,
      body: {},
    });
    if (install.statusCode >= 400) {
      throw new Error(
        `Entity Store is not installed (${install.statusCode}): ${kbnErrorMessage(
          install.body
        )}. Enable Entity Store v2, then retry.`
      );
    }
  }

  const deadline = Date.now() + ENTITY_STORE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if ((await readEntityStoreStatus(kbnRequest)) === 'running') {
      return initial;
    }
    await sleep(ENTITY_STORE_POLL_INTERVAL_MS);
  }
  throw new Error(
    `Entity Store did not reach "running" within ${ENTITY_STORE_READY_TIMEOUT_MS}ms.`
  );
};

const setEntityExtraction = async (
  kbnRequest: FpTpLiveKbnRequest,
  action: 'start' | 'stop'
): Promise<void> => {
  const response = await kbnRequest({
    method: 'PUT',
    path: `/api/security/entity_store/${action}`,
    version: ENTITY_API_VERSION,
    body: {},
  });
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to ${action} Entity Store extraction (${response.statusCode}): ${kbnErrorMessage(
        response.body
      )}`
    );
  }
};

/**
 * One-time setup a seed needs: the detection alerts index and an installed
 * Entity Store with log extraction stopped. Extraction would otherwise build
 * entities from the seeded events, so a world without entities would not stay
 * that way. Call once before seeding, not per seed, so concurrent seeds don't
 * race the install. Returns a function that restarts extraction if it was
 * running before this call.
 */
export const ensureFpTpSeedPrerequisites = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<() => Promise<void>> => {
  await ensureDetectionAlertsIndex(kbnRequest);
  const initialStatus = await waitForEntityStoreInstalled(kbnRequest);
  await setEntityExtraction(kbnRequest, 'stop');
  return initialStatus === 'running'
    ? () => setEntityExtraction(kbnRequest, 'start')
    : async () => undefined;
};

const deleteEntity = async (kbnRequest: FpTpLiveKbnRequest, entityId: string): Promise<void> => {
  const response = await kbnRequest({
    method: 'DELETE',
    path: '/api/security/entity_store/entities/',
    version: ENTITY_API_VERSION,
    body: { entityId },
  });
  if (response.statusCode >= 400 && !isNotFound(response.statusCode)) {
    throw new Error(
      `Failed to delete entity ${entityId} (${response.statusCode}): ${kbnErrorMessage(
        response.body
      )}`
    );
  }
};

const createEntity = async (
  kbnRequest: FpTpLiveKbnRequest,
  request: FpTpEntityCrudRequest
): Promise<void> => {
  const create = async (): Promise<{ statusCode: number; body: unknown }> =>
    kbnRequest({
      method: 'POST',
      path: `/api/security/entity_store/entities/${request.entityType}`,
      version: ENTITY_API_VERSION,
      body: request.body,
    });

  let response = await create();
  if (isAlreadyExists(response.statusCode, response.body)) {
    await deleteEntity(kbnRequest, request.entityId);
    response = await create();
  }
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to create ${request.entityType} entity ${request.entityId} (${
        response.statusCode
      }): ${kbnErrorMessage(response.body)}`
    );
  }
};

const writeIdentityFields = async (
  esClient: EsClient,
  request: FpTpEntityCrudRequest
): Promise<void> => {
  if (request.identityFields === undefined) {
    return;
  }
  const { updated } = await esClient.updateByQuery({
    index: FP_TP_ENTITY_READ_ALIAS,
    refresh: true,
    query: { term: { 'entity.id': request.entityId } },
    script: {
      source:
        'for (entry in params.fields.entrySet()) { ctx._source[entry.getKey()] = entry.getValue(); }',
      params: { fields: request.identityFields },
    },
  });
  if (updated !== 1) {
    throw new Error(
      `Expected to write identity fields on entity ${request.entityId}, updated ${updated}`
    );
  }
};

const esStatusCode = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? (error as { statusCode?: number }).statusCode
    : undefined;

const deleteBySeedLabel = async (esClient: EsClient, index: string): Promise<void> => {
  try {
    await esClient.deleteByQuery({
      index,
      query: { term: { 'labels.ad_portable_seed': FP_TP_TWIN_SEED_LABEL } },
      conflicts: 'proceed',
      refresh: true,
    });
  } catch (error) {
    if (esStatusCode(error) !== 404) {
      throw error;
    }
  }
};

/**
 * Endpoint logs data streams typically do not index `labels.ad_portable_seed`,
 * so a seed-label deleteByQuery leaves the previous twin's events in place.
 * Data streams also reject overwrite (`create` only), so leftover ids 409.
 */
const deleteDocumentsById = async (
  esClient: EsClient,
  documents: ReadonlyArray<{ index: string; id: string }>
): Promise<void> => {
  const idsByIndex = new Map<string, string[]>();
  for (const document of documents) {
    const ids = idsByIndex.get(document.index);
    if (ids === undefined) {
      idsByIndex.set(document.index, [document.id]);
    } else {
      ids.push(document.id);
    }
  }

  for (const [index, ids] of idsByIndex) {
    try {
      await esClient.deleteByQuery({
        index,
        query: { ids: { values: ids } },
        conflicts: 'proceed',
        refresh: true,
        ignore_unavailable: true,
      });
    } catch (error) {
      if (esStatusCode(error) !== 404) {
        throw error;
      }
    }
  }
};

/**
 * Removes whatever an earlier manual seed left under the default run marker, plus
 * `events` by id (data streams do not index the seed label).
 */
export const cleanupManualSeedLive = async (
  esClient: EsClient,
  events: ReadonlyArray<{ index: string; id: string }> = []
): Promise<void> => {
  for (const index of [...AD2_SCENARIO_ALL_INDICES, FP_TP_ATTACK_ADHOC_INDEX]) {
    await deleteBySeedLabel(esClient, index);
  }
  await deleteDocumentsById(esClient, events);
};

const ENTITIES_ON_HOSTS_PAGE_SIZE = 100;

/** Also removes entities the Entity Store built from the seeded events itself. */
const deleteEntitiesOnHosts = async (
  esClient: EsClient,
  kbnRequest: FpTpLiveKbnRequest,
  hostIds: readonly string[]
): Promise<void> => {
  if (hostIds.length === 0) {
    return;
  }
  const response = await esClient.search<{ entity?: { id?: string } }>({
    index: FP_TP_ENTITY_READ_ALIAS,
    ignore_unavailable: true,
    size: ENTITIES_ON_HOSTS_PAGE_SIZE,
    _source: ['entity.id'],
    query: { terms: { 'host.id': [...hostIds] } },
  });
  for (const hit of response.hits.hits) {
    const entityId = hit._source?.entity?.id;
    if (entityId !== undefined) {
      await deleteEntity(kbnRequest, entityId);
    }
  }
};

const cleanupLiveSeedPlan = async ({
  esClient,
  kbnRequest,
  plan,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  plan: FpTpLiveSeedPlan;
}): Promise<void> => {
  await deleteDocumentsById(esClient, [
    ...plan.alertIds.map((id) => ({ index: AD2_ALERTS_INDEX, id })),
    ...plan.events,
    { index: plan.attackIndex, id: plan.attackId },
  ]);
  for (const entity of plan.entities) {
    await deleteEntity(kbnRequest, entity.entityId);
  }
  await deleteEntitiesOnHosts(esClient, kbnRequest, plan.hostIds);
};

/**
 * Seeds one world and returns the handle that removes it. Call
 * `ensureFpTpSeedPrerequisites` once beforehand. A partial seed is cleaned up
 * before the error is rethrown; if that cleanup fails, it is handed to
 * `onCleanupFailure` so the caller can retry it.
 */
export const seedFixture = async ({
  esClient,
  kbnRequest,
  world,
  now = new Date(),
  onCleanupFailure,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  world: FpTpWorld;
  now?: Date;
  onCleanupFailure?: (cleanup: () => Promise<void>) => void;
}): Promise<FpTpSeededFixture> => {
  const plan = buildLiveSeedPlan(world, now);
  const cleanup = () => cleanupLiveSeedPlan({ esClient, kbnRequest, plan });

  try {
    if (plan.alertOperations.length > 0) {
      assertBulkOk(
        'alerts',
        await esClient.bulk({ refresh: 'wait_for', operations: plan.alertOperations })
      );
    }
    if (plan.eventOperations.length > 0) {
      assertBulkOk(
        'events',
        await esClient.bulk({ refresh: 'wait_for', operations: plan.eventOperations })
      );
    }
    if (plan.attackDocument) {
      await esClient.index({
        index: plan.attackIndex,
        id: plan.attackId,
        document: plan.attackDocument,
        refresh: 'wait_for',
      });
    }
    for (const entity of plan.entities) {
      await createEntity(kbnRequest, entity);
      await writeIdentityFields(esClient, entity);
    }
  } catch (error) {
    await cleanup().catch(() => onCleanupFailure?.(cleanup));
    throw error;
  }

  return { cleanup, seededWorld: plan.world };
};

/**
 * Seeds one twin for manual runs in the Workflows UI, replacing whatever an earlier
 * manual seed left. The documents stay until the next manual seed replaces them.
 */
export const seedTwinLive = async ({
  esClient,
  kbnRequest,
  twin,
  now = new Date(),
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  twin: FpTpTwin;
  now?: Date;
}): Promise<FpTpLiveSeedSummary> => {
  const plan = buildLiveSeedPlan(twinToWorld(twin), now);

  await ensureFpTpSeedPrerequisites(kbnRequest);
  await cleanupManualSeedLive(esClient, plan.events);
  for (const entity of plan.entities) {
    await deleteEntity(kbnRequest, entity.entityId);
  }
  await deleteEntitiesOnHosts(esClient, kbnRequest, plan.hostIds);

  await seedFixture({ esClient, kbnRequest, world: twinToWorld(twin), now });

  return {
    twinId: twin.id,
    attackId: plan.attackId,
    attackIndex: plan.attackIndex,
    alertCount: twin.alerts.length,
    eventCount: twin.events.length,
    entityIds: plan.entities.map((entity) => entity.entityId),
    gold: twin.gold,
  };
};
