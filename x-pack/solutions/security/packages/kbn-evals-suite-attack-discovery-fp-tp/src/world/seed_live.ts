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
  FP_TP_BOOTSTRAP_RULE_ID,
  FP_TP_ENTITY_READ_ALIAS,
  FP_TP_RAW_EVENT_INDEX_PREFIX,
  FP_TP_RAW_EVENT_INGEST_PIPELINE,
  FP_TP_REASONING_FEATURE_ID,
  FP_TP_TWIN_SEED_LABEL,
  fpTpAdhocAttackIndexForSpace,
  fpTpAlertsIndexForSpace,
  fpTpEntityReadAliasForSpace,
  toServerlessEventIndex,
} from './constants';
import { toEntityCrudRequest } from './entity_crud';
import type { FpTpEntityCrudRequest } from './entity_crud';
import { ensureFpTpRawEventStore, rawEventIndexNames } from './raw_events';
import { shiftTwinToNow } from './shift_timestamps';
import type { FpTpGold, FpTpTwin, FpTpWorld } from './types';

export type FpTpLiveKbnRequest = (options: {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

export const assertBulkOk = (
  label: string,
  result: { errors?: boolean; items?: unknown[] }
): void => {
  if (result.errors !== true) {
    return;
  }
  throw new Error(`${label} bulk had item errors: ${JSON.stringify(result.items)}`);
};

export const kbnErrorMessage = (body: unknown): string => {
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

export const deleteEntity = async (
  kbnRequest: FpTpLiveKbnRequest,
  entityId: string
): Promise<void> => {
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

export const createEntity = async (
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

export const writeIdentityFields = async (
  esClient: EsClient,
  request: FpTpEntityCrudRequest,
  readAlias: string = FP_TP_ENTITY_READ_ALIAS
): Promise<void> => {
  if (request.identityFields === undefined) {
    return;
  }
  const { updated } = await esClient.updateByQuery({
    index: readAlias,
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

/** deleteByQuery that tolerates a missing index or pattern. */
const deleteQuietly = async (
  esClient: EsClient,
  { index, query }: { index: string; query: Record<string, unknown> }
): Promise<void> => {
  try {
    await esClient.deleteByQuery({
      index,
      query,
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  } catch (error) {
    if (esStatusCode(error) !== 404) {
      throw error;
    }
  }
};

/**
 * Seeded raw events in the space's namespace of the seeder-owned streams: any
 * whose run marker starts with the seed label, or that sit on `hostIds`. The
 * namespace filter keeps a sweep from reaching another space's seed.
 */
export const seededRawEventsInSpaceQuery = (
  space: string,
  hostIds: readonly string[] = []
): Record<string, unknown> => ({
  bool: {
    filter: [
      { term: { 'data_stream.namespace': space } },
      {
        bool: {
          should: [
            { prefix: { 'labels.ad_portable_seed': FP_TP_TWIN_SEED_LABEL } },
            ...(hostIds.length > 0 ? [{ terms: { 'host.id': [...hostIds] } }] : []),
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

/**
 * Endpoint logs data streams typically do not index `labels.ad_portable_seed`,
 * so a seed-label deleteByQuery leaves the previous twin's events in place.
 * Data streams also reject overwrite (`create` only), so leftover ids 409.
 */
export const deleteDocumentsById = async (
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
export const deleteEntitiesOnHosts = async (
  esClient: EsClient,
  kbnRequest: FpTpLiveKbnRequest,
  hostIds: readonly string[],
  readAlias: string = FP_TP_ENTITY_READ_ALIAS
): Promise<void> => {
  if (hostIds.length === 0) {
    return;
  }
  const response = await esClient.search<{ entity?: { id?: string } }>({
    index: readAlias,
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

// ---------------------------------------------------------------------------
// Serverless (space-scoped) manual seeding.
//
// On a serverless project the seeder must not create dot-prefixed indices or
// write product-managed data streams directly. Alerts go through the detection
// engine bootstrap, entities through the Entity Store CRUD API, raw events into
// a seeder-owned `logs-endpoint.events.<kind>-<space>` namespace, and the
// Attack Discovery is persisted by running the managed
// `system-attack-discovery-validate` workflow in the space — the managed FP/TP
// analysis then reads it from the space's ad-hoc index.
// ---------------------------------------------------------------------------

const WORKFLOWS_API_VERSION = '2023-10-31';
const INFERENCE_SETTINGS_API_VERSION = '1';
const VALIDATE_WORKFLOW_ID = 'system-attack-discovery-validate';
const BOOTSTRAP_RULE_QUERY = 'data_stream.dataset:never-matches-fptp-seeder-bootstrap';
const ALERTS_STREAM_TIMEOUT_MS = 180_000;
const ALERTS_STREAM_POLL_INTERVAL_MS = 5_000;
const VALIDATE_EXECUTION_TIMEOUT_MS = 300_000;
const VALIDATE_POLL_INTERVAL_MS = 3_000;
const SPACE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PREVIOUS_SERVERLESS_SEED_PAGE_SIZE = 10_000;

/**
 * Refuses to run the serverless path against the default space: its bootstrap
 * is not undone by cleanup (shared reasoning mapping, stopped Entity Store
 * extraction, enabled no-match rule), so it must stay in a dedicated space.
 */
export const assertServerlessSpace = (space: string | undefined): string => {
  if (space === undefined || space.length === 0) {
    throw new Error('--serverless needs an explicit --space (a dedicated one, not "default")');
  }
  if (space === 'default') {
    throw new Error(
      '--serverless refuses the default space: seeding there would stop Entity Store ' +
        'extraction, rewrite the shared reasoning mapping and leave an enabled rule in the ' +
        'space — none of which cleanup undoes. Use a dedicated space.'
    );
  }
  if (!SPACE_ID_PATTERN.test(space)) {
    throw new Error(
      `--space "${space}" is not a valid Kibana space id (expected [a-z0-9][a-z0-9_-]{0,63})`
    );
  }
  return space;
};

/**
 * The classic path writes the default space's alerts, discovery and entity
 * indices, so a Kibana client scoped to another space would split the seed.
 */
export const assertClassicSpace = (space: string | undefined): void => {
  if (space !== undefined && space !== 'default') {
    throw new Error(
      `--space "${space}" needs --serverless: the classic path seeds the default space only`
    );
  }
};

export interface FpTpServerlessSeedPlan extends FpTpLiveSeedPlan {
  /** The space every Kibana call is scoped to. */
  readonly space: string;
  /** Alerts index (product-managed data stream) inside the space. */
  readonly alertsIndex: string;
  /** Ad-hoc Attack Discovery index inside the space. */
  readonly adhocAttackIndex: string;
  /** Events rewritten into the seeder-owned namespace. */
  readonly serverlessEvents: ReadonlyArray<{ index: string; id: string }>;
  /** Title the persisted discovery is found and removed by; absent when the world has no attack. */
  readonly attackTitle?: string;
}

export interface FpTpValidateInputs {
  readonly alerts_context_count: number;
  readonly anonymized_alerts: ReadonlyArray<{ metadata: unknown; page_content: string }>;
  readonly api_config: { readonly connector_id: string; readonly action_type_id?: string };
  readonly attack_discoveries: readonly Record<string, unknown>[];
  readonly generation_uuid: string;
  readonly generation_source: string;
}

/** Maps an authored attack document onto a validate-workflow discovery payload. */
export const toValidateAttackDiscovery = (
  attack: Record<string, unknown>
): Record<string, unknown> => {
  const fields = attack as {
    '@timestamp'?: unknown;
    'kibana.alert.attack_discovery.alert_ids'?: unknown;
    'kibana.alert.attack_discovery.details_markdown'?: unknown;
    'kibana.alert.attack_discovery.entity_summary_markdown'?: unknown;
    'kibana.alert.attack_discovery.mitre_attack_tactics'?: unknown;
    'kibana.alert.attack_discovery.summary_markdown'?: unknown;
    'kibana.alert.attack_discovery.title'?: unknown;
  };
  const alertIds = fields['kibana.alert.attack_discovery.alert_ids'];
  if (!Array.isArray(alertIds) || alertIds.length === 0) {
    throw new Error('Attack document has no kibana.alert.attack_discovery.alert_ids');
  }
  return {
    alert_ids: alertIds,
    details_markdown: fields['kibana.alert.attack_discovery.details_markdown'] ?? undefined,
    entity_summary_markdown:
      fields['kibana.alert.attack_discovery.entity_summary_markdown'] ?? undefined,
    mitre_attack_tactics: fields['kibana.alert.attack_discovery.mitre_attack_tactics'] ?? undefined,
    summary_markdown: fields['kibana.alert.attack_discovery.summary_markdown'] ?? undefined,
    timestamp: fields['@timestamp'] ?? undefined,
    title: fields['kibana.alert.attack_discovery.title'],
  };
};

/** Minimal anonymized-alert Documents the validate workflow accepts. */
export const toAnonymizedAlerts = (
  alerts: ReadonlyArray<{ id: string; source: Record<string, unknown> }>
): ReadonlyArray<{ metadata: unknown; page_content: string }> =>
  alerts.map(({ id, source }) => {
    const ruleName = source['kibana.alert.rule.name'];
    const reason = source['kibana.alert.reason'];
    const headline = typeof ruleName === 'string' ? ruleName : 'alert';
    return {
      metadata: { author: 'fptp-seeder' },
      page_content: `${id}: ${headline}${typeof reason === 'string' ? ` — ${reason}` : ''}`,
    };
  });

export const ensureBootstrapNoMatchRule = async (kbnRequest: FpTpLiveKbnRequest): Promise<void> => {
  const existing = await kbnRequest({
    method: 'GET',
    path: `/api/detection_engine/rules?rule_id=${FP_TP_BOOTSTRAP_RULE_ID}`,
    version: DETECTION_ENGINE_API_VERSION,
  });
  if (existing.statusCode < 400) {
    return;
  }
  if (!isNotFound(existing.statusCode)) {
    throw new Error(
      `Failed to look up bootstrap rule (${existing.statusCode}): ${kbnErrorMessage(existing.body)}`
    );
  }
  const created = await kbnRequest({
    method: 'POST',
    path: '/api/detection_engine/rules',
    version: DETECTION_ENGINE_API_VERSION,
    body: {
      name: 'FP/TP seeder bootstrap no-match rule',
      rule_id: FP_TP_BOOTSTRAP_RULE_ID,
      enabled: true,
      index: ['logs-*'],
      query: BOOTSTRAP_RULE_QUERY,
      from: 'now-1m',
      interval: '1m',
      severity: 'low',
      risk_score: 1,
      description: 'Always-on no-match rule that provisions the alerts data stream.',
      type: 'query',
      language: 'lucene',
      max_signals: 1,
      threat: [],
    },
  });
  if (created.statusCode >= 400 && !isAlreadyExists(created.statusCode, created.body)) {
    throw new Error(
      `Failed to create bootstrap rule (${created.statusCode}): ${kbnErrorMessage(created.body)}`
    );
  }
};

export const waitForAlertsDataStream = async (esClient: EsClient, index: string): Promise<void> => {
  const deadline = Date.now() + ALERTS_STREAM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await esClient.indices.exists({ index })) {
      return;
    }
    await sleep(ALERTS_STREAM_POLL_INTERVAL_MS);
  }
  throw new Error(
    `Alerts data stream ${index} did not appear within ${ALERTS_STREAM_TIMEOUT_MS}ms`
  );
};

/**
 * Reads the per-space inference feature settings. Throws when the read fails:
 * callers build a PUT body from the result, so a silent failure would wipe
 * every other feature mapping.
 */
const readInferenceFeatures = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<unknown[] | undefined> => {
  const settings = await kbnRequest({
    method: 'GET',
    path: '/internal/search_inference_endpoints/settings',
    version: INFERENCE_SETTINGS_API_VERSION,
  });
  if (settings.statusCode >= 400) {
    throw new Error(
      `Failed to read inference settings (${settings.statusCode}): ${kbnErrorMessage(
        settings.body
      )}`
    );
  }
  return (settings.body as { data?: { features?: unknown[] } } | undefined)?.data?.features;
};

const connectorIdFromFeatures = (features: unknown[] | undefined): string | undefined => {
  if (!Array.isArray(features)) {
    return undefined;
  }
  for (const feature of features) {
    const { feature_id: featureId, endpoints } = feature as {
      feature_id?: string;
      endpoints?: Array<{ id?: string }>;
    };
    if (featureId === FP_TP_REASONING_FEATURE_ID) {
      const id = endpoints?.[0]?.id;
      return typeof id === 'string' ? id : undefined;
    }
  }
  return undefined;
};

/**
 * Reads the per-space inference settings and returns the connector id mapped to
 * the FP/TP reasoning feature, if any.
 */
export const readReasoningConnectorId = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<string | undefined> => connectorIdFromFeatures(await readInferenceFeatures(kbnRequest));

export const ensureReasoningMapping = async (
  kbnRequest: FpTpLiveKbnRequest,
  connectorId: string
): Promise<void> => {
  // One read feeds both the no-op check and the PUT body, and a failed read
  // throws: an empty `others` here would make the PUT wipe every other feature.
  const features = await readInferenceFeatures(kbnRequest);
  if (connectorIdFromFeatures(features) === connectorId) {
    return;
  }
  const others = Array.isArray(features)
    ? features.filter(
        (feature) => (feature as { feature_id?: string }).feature_id !== FP_TP_REASONING_FEATURE_ID
      )
    : [];
  const response = await kbnRequest({
    method: 'PUT',
    path: '/internal/search_inference_endpoints/settings',
    version: INFERENCE_SETTINGS_API_VERSION,
    body: {
      features: [
        ...others,
        { feature_id: FP_TP_REASONING_FEATURE_ID, endpoints: [{ id: connectorId }] },
      ],
    },
  });
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to map ${FP_TP_REASONING_FEATURE_ID} to ${connectorId} (${
        response.statusCode
      }): ${kbnErrorMessage(response.body)}`
    );
  }
};

export const runValidateWorkflow = async (
  kbnRequest: FpTpLiveKbnRequest,
  inputs: FpTpValidateInputs
): Promise<void> => {
  const started = await kbnRequest({
    method: 'POST',
    path: `/api/workflows/workflow/${VALIDATE_WORKFLOW_ID}/run`,
    version: WORKFLOWS_API_VERSION,
    body: { inputs },
  });
  if (started.statusCode >= 400) {
    throw new Error(
      `Failed to run ${VALIDATE_WORKFLOW_ID} (${started.statusCode}): ${kbnErrorMessage(
        started.body
      )}`
    );
  }
  const executionId = (started.body as { workflowExecutionId?: string } | undefined)
    ?.workflowExecutionId;
  if (typeof executionId !== 'string') {
    throw new Error(`${VALIDATE_WORKFLOW_ID} run returned no workflowExecutionId`);
  }

  const deadline = Date.now() + VALIDATE_EXECUTION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(VALIDATE_POLL_INTERVAL_MS);
    const execution = await kbnRequest({
      method: 'GET',
      path: `/api/workflows/executions/${executionId}`,
      version: WORKFLOWS_API_VERSION,
    });
    if (execution.statusCode >= 400) {
      throw new Error(
        `Failed to read execution ${executionId} (${execution.statusCode}): ${kbnErrorMessage(
          execution.body
        )}`
      );
    }
    const status = (execution.body as { status?: string } | undefined)?.status;
    if (status === 'completed') {
      return;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`${VALIDATE_WORKFLOW_ID} execution ${executionId} ended "${status}"`);
    }
  }
  throw new Error(
    `${VALIDATE_WORKFLOW_ID} execution ${executionId} did not finish within ${VALIDATE_EXECUTION_TIMEOUT_MS}ms`
  );
};

/**
 * Locates the persisted Attack Discovery by its title. The validate workflow
 * derives the document `_id` (== `kibana.alert.uuid`) from a hash including the
 * authenticated user, so the seeder reads it back instead of recomputing it.
 */
export const findPersistedAttackId = async (
  esClient: EsClient,
  index: string,
  title: string
): Promise<string> => {
  const response = await esClient.search<{ 'kibana.alert.attack_discovery.title'?: string }>({
    index,
    size: 1,
    query: { match_phrase: { 'kibana.alert.attack_discovery.title': title } },
  });
  const id = response.hits.hits[0]?._id;
  if (id === undefined) {
    throw new Error(`No persisted Attack Discovery titled "${title}" in ${index}`);
  }
  return id;
};

const attackTitleOf = (attack: Record<string, unknown> | undefined): string | undefined => {
  const title = attack?.['kibana.alert.attack_discovery.title'];
  return typeof title === 'string' ? title : undefined;
};

export const buildServerlessPlan = (
  world: FpTpWorld,
  space: string,
  now: Date = new Date()
): FpTpServerlessSeedPlan => {
  const base = buildLiveSeedPlan(world, now);
  const alertsIndex = fpTpAlertsIndexForSpace(space);
  const serverlessEvents = base.events.map(({ index, id }) => ({
    index: toServerlessEventIndex(index, space),
    id,
  }));
  // Re-scope the shifted documents to the space: alerts land in
  // .alerts-security.alerts-<space> but are authored tagged to 'default', and
  // events keep data_stream.namespace 'default' while indexing into
  // logs-...-<space>. Copies only — the caller's world stays untouched.
  const spaceWorld: FpTpWorld = {
    ...base.world,
    attack:
      base.world.attack === undefined
        ? undefined
        : { ...base.world.attack, 'kibana.space_ids': [space] },
    alerts: base.world.alerts.map((alert) => ({
      ...alert,
      source: { ...alert.source, 'kibana.space_ids': [space] },
    })),
    events: base.world.events.map((event, position) => ({
      ...event,
      index: serverlessEvents[position].index,
      source: {
        ...event.source,
        data_stream: { ...(event.source.data_stream as object | undefined), namespace: space },
      },
    })),
  };
  return {
    ...base,
    world: spaceWorld,
    space,
    alertsIndex,
    adhocAttackIndex: fpTpAdhocAttackIndexForSpace(space),
    serverlessEvents,
    attackTitle: attackTitleOf(world.attack),
    // Bulk `create` (never `index`): the alerts index is a product-managed data
    // stream on serverless, and create keeps a leftover id loud (409) instead
    // of silently overwriting a previous seed.
    alertOperations: spaceWorld.alerts.flatMap((alert) => [
      { create: { _index: alertsIndex, _id: alert.id } },
      alert.source,
    ]),
    eventOperations: spaceWorld.events.flatMap((event) => [
      { create: { _index: event.index, _id: event.id } },
      event.source,
    ]),
  };
};

export const cleanupServerlessSeed = async ({
  esClient,
  kbnRequest,
  plan,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  plan: FpTpServerlessSeedPlan;
}): Promise<void> => {
  // An earlier seed of another scenario or variant in this space has other
  // ids and title, so find it by the seed label its alerts carry in `tags`.
  const previous = await esClient.search<{ host?: { id?: unknown } }>({
    index: plan.alertsIndex,
    ignore_unavailable: true,
    size: PREVIOUS_SERVERLESS_SEED_PAGE_SIZE,
    _source: ['host.id'],
    query: { prefix: { tags: FP_TP_TWIN_SEED_LABEL } },
  });
  const previousAlertIds = previous.hits.hits
    .map(({ _id: id }) => id)
    .filter((id): id is string => typeof id === 'string');
  const previousHostIds = previous.hits.hits
    .map(({ _source: source }) => source?.host?.id)
    .filter((id): id is string => typeof id === 'string');
  const hostIds = [...new Set([...plan.hostIds, ...previousHostIds])];

  // A seeder-owned raw-event stream DOES index `labels.ad_portable_seed`
  // (explicit mapping in the seeder-owned template), so a label sweep removes
  // a crashed run's leftovers that the id sweep below cannot name. Prefix:
  // serverless markers carry the space after the label.
  await deleteQuietly(esClient, {
    index: `${FP_TP_RAW_EVENT_INDEX_PREFIX}*`,
    query: seededRawEventsInSpaceQuery(plan.space, hostIds),
  });
  await deleteDocumentsById(esClient, [
    ...[...new Set([...plan.alertIds, ...previousAlertIds])].map((id) => ({
      index: plan.alertsIndex,
      id,
    })),
    ...plan.serverlessEvents,
  ]);
  // The persisted discovery's `_id` is a hash over alert ids, connector, user
  // and space — unknown until after the validate run — so delete it by title,
  // and an earlier seed's by the alerts it cites.
  if (plan.attackTitle !== undefined) {
    await deleteQuietly(esClient, {
      index: plan.adhocAttackIndex,
      query: { match_phrase: { 'kibana.alert.attack_discovery.title': plan.attackTitle } },
    });
  }
  if (previousAlertIds.length > 0) {
    await deleteQuietly(esClient, {
      index: plan.adhocAttackIndex,
      query: { terms: { 'kibana.alert.attack_discovery.alert_ids': previousAlertIds } },
    });
  }
  for (const entity of plan.entities) {
    await deleteEntity(kbnRequest, entity.entityId);
  }
  await deleteEntitiesOnHosts(
    esClient,
    kbnRequest,
    hostIds,
    fpTpEntityReadAliasForSpace(plan.space)
  );
};

/**
 * Seeds one FP/TP twin into a Kibana space on a serverless project. Returns
 * the summary plus a cleanup handle. `reasoningConnectorId` maps the space's
 * `alertzero_frontier` inference feature so the managed analysis (and the
 * validate workflow's connector bookkeeping) resolve a connector in the space.
 */
export const seedTwinLiveServerless = async ({
  esClient,
  kbnRequest,
  twin,
  space,
  reasoningConnectorId,
  now = new Date(),
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  twin: FpTpTwin;
  space: string;
  reasoningConnectorId: string;
  now?: Date;
}): Promise<{ summary: FpTpLiveSeedSummary; cleanup: () => Promise<void> }> => {
  assertServerlessSpace(space);
  const world = twinToWorld(twin);
  const plan = buildServerlessPlan(world, space, now);

  await ensureFpTpSeedPrerequisites(kbnRequest);
  await ensureBootstrapNoMatchRule(kbnRequest);
  await waitForAlertsDataStream(esClient, plan.alertsIndex);
  await ensureReasoningMapping(kbnRequest, reasoningConnectorId);

  const cleanup = () => cleanupServerlessSeed({ esClient, kbnRequest, plan });

  try {
    await cleanup();

    // The seeder-owned streams must exist (through the seeder-owned template)
    // before the bulk, and every event passes the pipeline so @timestamp is a
    // real date and event.ingested reflects ingest time.
    assertBulkOk(
      'alerts',
      await esClient.bulk({ refresh: 'wait_for', operations: plan.alertOperations })
    );
    if (plan.eventOperations.length > 0) {
      await ensureFpTpRawEventStore(esClient, rawEventIndexNames(plan.serverlessEvents));
      assertBulkOk(
        'events',
        await esClient.bulk({
          refresh: 'wait_for',
          operations: plan.eventOperations,
          pipeline: FP_TP_RAW_EVENT_INGEST_PIPELINE,
        })
      );
    }

    for (const entity of plan.entities) {
      await createEntity(kbnRequest, entity);
      await writeIdentityFields(esClient, entity, fpTpEntityReadAliasForSpace(space));
    }

    let persistedAttackId = plan.attackId;
    if (world.attack !== undefined && plan.attackTitle !== undefined) {
      await runValidateWorkflow(kbnRequest, {
        alerts_context_count: world.alerts.length,
        anonymized_alerts: toAnonymizedAlerts(world.alerts),
        api_config: { connector_id: reasoningConnectorId, action_type_id: '.inference' },
        attack_discoveries: [toValidateAttackDiscovery(world.attack)],
        generation_uuid: `${FP_TP_TWIN_SEED_LABEL}-${Date.now()}`,
        generation_source: 'fptp-seeder',
      });
      persistedAttackId = await findPersistedAttackId(
        esClient,
        plan.adhocAttackIndex,
        plan.attackTitle
      );
    }

    return {
      summary: {
        twinId: twin.id,
        attackId: persistedAttackId,
        attackIndex: plan.adhocAttackIndex,
        alertCount: twin.alerts.length,
        eventCount: twin.events.length,
        entityIds: plan.entities.map((entity) => entity.entityId),
        gold: twin.gold,
      },
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};
