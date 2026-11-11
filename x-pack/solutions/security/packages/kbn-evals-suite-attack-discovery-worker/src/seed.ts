/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AuditAlert, AuditScenario } from '@kbn/evals-suite-attack-discovery';
import {
  AD_WORKFLOWS_SETTING,
  ALERTS_INDEX_POLL_INTERVAL_MS,
  ALERTS_INDEX_TIMEOUT_MS,
  ALERTZERO_ENABLED_SETTING_ID,
  ANONYMIZATION_FIELDS_FIND_ROUTE,
  BOOTSTRAP_RULE_ID,
  BOOTSTRAP_RULE_QUERY,
  DETECTION_ENGINE_API_VERSION,
  ENTITY_API_VERSION,
  ENTITY_STORE_POLL_INTERVAL_MS,
  ENTITY_STORE_READY_TIMEOUT_MS,
  PUBLIC_API_VERSION,
  SEED_WINDOW_END_OFFSET_MS,
  SEED_WINDOW_MS,
  UI_SETTINGS_ROUTE,
  alertsIndexForSpace,
  anonymizationFieldsIndexForSpace,
  attackDiscoveryIndexForSpace,
} from './constants';
import { errorMessage, sleep, spacePath } from './kibana_api';
import { kbnErrorMessage, type KbnRequest } from './kbn_request';
import { buildWorld, hasWorld, hostIdFor, type WorldDoc } from './worker_world';
import {
  buildSeededFalsePositiveDiscovery,
  SEEDED_FALSE_POSITIVE_SCENARIO_ID,
} from './scenarios/seeded_false_positive';

/** Index holding the fingerprints that `match_fingerprints` compares new attacks against. */
export const ATTACK_FINGERPRINT_INDEX = 'ai-index-idx-security-attack-fingerprints';
/** Agent Builder conversations (Investigations live here); scoped by the top-level `space` field. */
const CONVERSATIONS_INDEX = '.chat-conversations';
/** Agentic-investigations side documents (subject/claim/hypotheses/impact), scoped by `spaceId`. */
const INVESTIGATION_SIDE_INDEX = '.kibana-investigation-*';
/** Proposals the review opened; scoped by `spaceId` (see `@kbn/proposals-common` storage). */
const PROPOSALS_INDEX_NAME = '.kibana-proposals';

/** A fresh marker per seed: attacks dedupe on a hash of their alert ids, so ids must be new. */
export const newRunMarker = (scenarioId: string): string =>
  `adw-${createHash('sha256')
    .update(`${scenarioId}:${Date.now()}:${Math.random()}`)
    .digest('hex')
    .slice(0, 10)}`;

const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * AlertZero routes 404 in a Classic space, so the eval space needs the Security solution view.
 */
const EVAL_SPACE_SOLUTION = 'security';

const ensureSpace = async ({
  request,
  log,
  spaceId,
}: {
  request: KbnRequest;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  const existing = await request({
    method: 'GET',
    path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
    version: PUBLIC_API_VERSION,
  });
  if (existing.statusCode < 400) {
    const space = existing.body as { solution?: string } & Record<string, unknown>;
    if (space.solution === EVAL_SPACE_SOLUTION) return;
    log.info(`[ad-worker] switching eval space "${spaceId}" to the ${EVAL_SPACE_SOLUTION} view`);
    const updated = await request({
      method: 'PUT',
      path: `/api/spaces/space/${encodeURIComponent(spaceId)}`,
      version: PUBLIC_API_VERSION,
      body: { ...space, solution: EVAL_SPACE_SOLUTION },
    });
    if (updated.statusCode >= 400) {
      throw new Error(`Could not update space "${spaceId}": ${kbnErrorMessage(updated.body)}`);
    }
    return;
  }
  if (existing.statusCode !== 404) {
    throw new Error(`Could not read space "${spaceId}": ${kbnErrorMessage(existing.body)}`);
  }
  log.info(`[ad-worker] creating eval space "${spaceId}"`);
  const created = await request({
    method: 'POST',
    path: '/api/spaces/space',
    version: PUBLIC_API_VERSION,
    body: { id: spaceId, name: spaceId, disabledFeatures: [], solution: EVAL_SPACE_SOLUTION },
  });
  if (created.statusCode >= 400 && created.statusCode !== 409) {
    throw new Error(`Could not create space "${spaceId}": ${kbnErrorMessage(created.body)}`);
  }
};

const ensureSettingsEnabled = async ({
  request,
  spaceId,
  settingIds,
}: {
  request: KbnRequest;
  spaceId: string;
  settingIds: readonly string[];
}): Promise<void> => {
  const path = spacePath(spaceId, UI_SETTINGS_ROUTE);
  const current = await request({ method: 'GET', path });
  const settings =
    (current.body as { settings?: Record<string, { userValue?: unknown }> } | undefined)
      ?.settings ?? {};
  const changes = Object.fromEntries(
    settingIds.filter((id) => settings[id]?.userValue !== true).map((id) => [id, true])
  );
  if (Object.keys(changes).length === 0) return;
  const response = await request({ method: 'POST', path, body: { changes } });
  if (response.statusCode >= 400) {
    throw new Error(
      `Could not enable ${Object.keys(changes).join(', ')} in "${spaceId}": ${kbnErrorMessage(
        response.body
      )}`
    );
  }
};

const waitForIndex = async ({
  esClient,
  index,
  timeoutMs,
}: {
  esClient: Client;
  index: string;
  timeoutMs: number;
}): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await esClient.indices.exists({ index })) return;
    await sleep(ALERTS_INDEX_POLL_INTERVAL_MS);
  }
  throw new Error(`Index ${index} did not appear within ${timeoutMs}ms`);
};

/**
 * Creates the space's alerts index. A detection rule that matches nothing makes the first rule
 * run create it; the seeded alerts are written straight into that index.
 */
const ensureAlertsIndex = async ({
  request,
  esClient,
  log,
  spaceId,
}: {
  request: KbnRequest;
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  const index = alertsIndexForSpace(spaceId);
  const detectionIndex = await request({
    method: 'POST',
    path: spacePath(spaceId, '/api/detection_engine/index'),
    version: DETECTION_ENGINE_API_VERSION,
  });
  if (detectionIndex.statusCode >= 400 && detectionIndex.statusCode !== 409) {
    throw new Error(
      `Could not create the detection index: ${kbnErrorMessage(detectionIndex.body)}`
    );
  }
  if (await esClient.indices.exists({ index })) return;

  const rulePath = spacePath(spaceId, '/api/detection_engine/rules');
  const existing = await request({
    method: 'GET',
    path: `${rulePath}?rule_id=${encodeURIComponent(BOOTSTRAP_RULE_ID)}`,
    version: DETECTION_ENGINE_API_VERSION,
  });
  if (existing.statusCode === 404) {
    log.info(`[ad-worker] creating bootstrap rule so ${index} is created`);
    const created = await request({
      method: 'POST',
      path: rulePath,
      version: DETECTION_ENGINE_API_VERSION,
      body: {
        name: 'AD worker eval bootstrap (matches nothing)',
        rule_id: BOOTSTRAP_RULE_ID,
        enabled: true,
        index: ['logs-*'],
        query: BOOTSTRAP_RULE_QUERY,
        from: 'now-1m',
        interval: '1m',
        severity: 'low',
        risk_score: 1,
        description: 'Creates the alerts index for the Attack Discovery worker eval.',
        type: 'query',
        language: 'lucene',
        max_signals: 1,
        threat: [],
      },
    });
    if (created.statusCode >= 400 && created.statusCode !== 409) {
      throw new Error(`Could not create the bootstrap rule: ${kbnErrorMessage(created.body)}`);
    }
  } else if (existing.statusCode >= 400) {
    throw new Error(`Could not read the bootstrap rule: ${kbnErrorMessage(existing.body)}`);
  }
  await waitForIndex({ esClient, index, timeoutMs: ALERTS_INDEX_TIMEOUT_MS });
};

const ensureAnonymizationFields = async ({
  request,
  esClient,
  spaceId,
}: {
  request: KbnRequest;
  esClient: Client;
  spaceId: string;
}): Promise<void> => {
  const response = await request({
    method: 'GET',
    path: `${spacePath(spaceId, ANONYMIZATION_FIELDS_FIND_ROUTE)}?per_page=1`,
    version: PUBLIC_API_VERSION,
  });
  if (response.statusCode >= 400) {
    throw new Error(`Could not read anonymization fields: ${kbnErrorMessage(response.body)}`);
  }
  await waitForIndex({
    esClient,
    index: anonymizationFieldsIndexForSpace(spaceId),
    timeoutMs: ALERTS_INDEX_TIMEOUT_MS,
  });
};

type EntityStoreStatus = string | undefined;

const entityStoreStatus = async (
  request: KbnRequest,
  spaceId: string
): Promise<EntityStoreStatus> => {
  const response = await request({
    method: 'GET',
    path: spacePath(spaceId, '/api/security/entity_store/status'),
    version: ENTITY_API_VERSION,
  });
  return response.statusCode < 400 ? (response.body as { status?: string }).status : undefined;
};

const waitForEntityStoreInstalled = async ({
  request,
  spaceId,
}: {
  request: KbnRequest;
  spaceId: string;
}): Promise<EntityStoreStatus> => {
  const initial = await entityStoreStatus(request, spaceId);
  if (initial === 'running' || initial === 'stopped') return initial;
  if (initial !== 'installing') {
    const install = await request({
      method: 'POST',
      path: spacePath(spaceId, '/api/security/entity_store/install'),
      version: ENTITY_API_VERSION,
      body: {},
    });
    if (install.statusCode >= 400) {
      throw new Error(
        `Entity Store is not installed and could not be installed (${kbnErrorMessage(
          install.body
        )}). Enable Entity Store v2 on the stack.`
      );
    }
  }
  const deadline = Date.now() + ENTITY_STORE_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await entityStoreStatus(request, spaceId);
    if (status === 'running' || status === 'stopped') return status;
    await sleep(ENTITY_STORE_POLL_INTERVAL_MS);
  }
  throw new Error('Entity Store did not finish installing in time');
};

const setEntityExtraction = async ({
  request,
  spaceId,
  action,
}: {
  request: KbnRequest;
  spaceId: string;
  action: 'start' | 'stop';
}): Promise<void> => {
  const response = await request({
    method: 'PUT',
    path: spacePath(spaceId, `/api/security/entity_store/${action}`),
    version: ENTITY_API_VERSION,
    body: {},
  });
  if (response.statusCode >= 400) {
    throw new Error(`Entity Store ${action} failed: ${kbnErrorMessage(response.body)}`);
  }
};

/**
 * Non-destructive world setup: the eval space with AlertZero and the Attack Discovery
 * workflows enabled, the alerts index, anonymization fields and an installed Entity Store.
 * An absent store is installed and left installed. Returns the Entity Store's status once it is
 * installed (`running` or `stopped`), for `pauseEntityExtraction`: a store this run just installed
 * starts extracting on its own, so the pre-install status would miss it.
 */
export const prepareWorkerSpace = async ({
  request,
  esClient,
  log,
  spaceId,
}: {
  request: KbnRequest;
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<{ entityStoreStatus: string | undefined }> => {
  await ensureSpace({ request, log, spaceId });
  await ensureSettingsEnabled({
    request,
    spaceId,
    settingIds: [ALERTZERO_ENABLED_SETTING_ID, AD_WORKFLOWS_SETTING],
  });
  await ensureAlertsIndex({ request, esClient, log, spaceId });
  await ensureAnonymizationFields({ request, esClient, spaceId });
  return { entityStoreStatus: await waitForEntityStoreInstalled({ request, spaceId }) };
};

/**
 * Stops Entity Store extraction so it cannot rewrite the seeded alerts mid-run. The returned
 * function restarts it, and throws if it cannot, so a stack left paused is never reported clean.
 * A store that was `stopped` is neither stopped nor restarted.
 */
export const pauseEntityExtraction = async ({
  request,
  spaceId,
  entityStoreStatus: initial,
}: {
  request: KbnRequest;
  spaceId: string;
  entityStoreStatus: string | undefined;
}): Promise<() => Promise<void>> => {
  if (initial !== 'running') return async () => undefined;
  await setEntityExtraction({ request, spaceId, action: 'stop' });
  return () => setEntityExtraction({ request, spaceId, action: 'start' });
};

export interface SeededScenario {
  runMarker: string;
  spaceId: string;
  /** Seeded `_id` to the scenario's own alert id, so evaluators compare against gold ids. */
  goldIdBySeededId: ReadonlyMap<string, string>;
  alertCount: number;
  /**
   * The entity store records and raw endpoint events written next to the alerts (see
   * `worker_world.ts`), by index and `_id`. Removed with the seed.
   */
  worldDocs: ReadonlyArray<Pick<WorldDoc, 'index' | 'id'>>;
  /** `_id` of the authored discovery seeded next to the alerts (seeded-false-positive only). */
  seededDiscoveryId?: string;
  /**
   * Ids (mapped back to the scenario's own) of every open alert in the space right after seeding.
   * The generation step reports only how many alerts it read, so this is the id set it can read.
   */
  openAlertIds: string[];
}

const toIso = (ms: number): string => new Date(ms).toISOString();

/**
 * Maps the audit timestamps (fixed in March 2026) linearly into the runner's lookback window,
 * keeping their order, so the batched generation query retrieves them.
 */
const rescaleTimestamps = ({
  alerts,
  now,
}: {
  alerts: readonly AuditAlert[];
  now: number;
}): Map<string, number> => {
  const originals = alerts.map((alert) => {
    const parsed = Date.parse(String(alert.fields['@timestamp'] ?? ''));
    return { id: alert.id, ms: Number.isNaN(parsed) ? undefined : parsed };
  });
  const known = originals.flatMap(({ ms }) => (ms === undefined ? [] : [ms]));
  const min = known.length > 0 ? Math.min(...known) : 0;
  const max = known.length > 0 ? Math.max(...known) : 0;
  const start = now - SEED_WINDOW_MS;
  const span = SEED_WINDOW_MS - SEED_WINDOW_END_OFFSET_MS;
  return new Map(
    originals.map(({ id, ms }, index) => {
      const fraction =
        ms === undefined || max === min
          ? index / Math.max(originals.length - 1, 1)
          : (ms - min) / (max - min);
      return [id, start + Math.round(fraction * span)];
    })
  );
};

const isFlatAlertField = (key: string): boolean => key.startsWith('kibana.');

/**
 * A dotted-field map as nested objects, except the keys `keepFlat` names. Alerts keep `kibana.*`
 * flat, as the detection engine writes them. The review workflow reads `_source` with liquid
 * `map: '_source.host.id'` (and `_source.entity.id` for grounding), which only walks nested
 * objects, so a flat `host.id` key reads as no host and the review sees an empty world.
 */
export const toNestedSource = (
  fields: Record<string, unknown>,
  keepFlat: (key: string) => boolean = () => false
): Record<string, unknown> => {
  const source: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const segments = keepFlat(key) ? [key] : key.split('.');
    const leaf = segments[segments.length - 1];
    let node = source;
    for (const segment of segments.slice(0, -1)) {
      const child = node[segment] ?? {};
      if (typeof child !== 'object' || child === null || Array.isArray(child)) {
        throw new Error(`Field "${key}" nests under "${segment}", which holds a value`);
      }
      node[segment] = child;
      node = child as Record<string, unknown>;
    }
    if (typeof node[leaf] === 'object' && node[leaf] !== null && !Array.isArray(node[leaf])) {
      throw new Error(`Field "${key}" holds a value and also has nested fields`);
    }
    node[leaf] = value;
  }
  return source;
};

/**
 * One alert document. It is merged as a flat dotted-field map, so the base fields and the
 * scenario's own dotted fields cannot collide as object-versus-leaf and the scenario's values
 * win, then written in the detection engine's shape (`toNestedSource`).
 */
export const buildSeededAlert = ({
  alert,
  seededId,
  runMarker,
  spaceId,
  timestampMs,
  withHostId = false,
}: {
  alert: AuditAlert;
  seededId: string;
  runMarker: string;
  spaceId: string;
  timestampMs: number;
  /** Adds the `host.id` the scenario's raw events are keyed on. */
  withHostId?: boolean;
}): Record<string, unknown> => {
  const timestamp = toIso(timestampMs);
  const ruleName = String(alert.fields['kibana.alert.rule.name'] ?? 'Seeded detection');
  const ruleId = `${runMarker}-rule-${slug(ruleName)}`;
  const severity = String(alert.fields['kibana.alert.severity'] ?? 'medium');
  const riskScore = Number(alert.fields['kibana.alert.risk_score'] ?? 50);
  const reason = String(alert.fields.message ?? ruleName);
  const base: Record<string, unknown> = {
    '@timestamp': timestamp,
    'ecs.version': '9.0.0',
    'event.kind': 'signal',
    'event.category': ['intrusion_detection'],
    'event.module': 'endpoint',
    'event.dataset': 'endpoint.alerts',
    'event.action': 'rule_detection',
    'event.risk_score': riskScore,
    tags: [runMarker],
    'labels.ad_portable_seed': runMarker,
    message: reason,
    'rule.name': ruleName,
    'rule.id': ruleId,
    'rule.description': reason,
    'kibana.alert.rule.category': 'Endpoint Behavior Detection',
    'kibana.alert.rule.consumer': 'siem',
    'kibana.alert.rule.producer': 'siem',
    'kibana.alert.rule.name': ruleName,
    'kibana.alert.rule.rule_type_id': 'siem.eqlRule',
    'kibana.alert.rule.rule_id': ruleId,
    'kibana.alert.rule.uuid': ruleId,
    'kibana.alert.rule.severity': severity,
    'kibana.alert.rule.risk_score': riskScore,
    'kibana.alert.severity': severity,
    'kibana.alert.risk_score': riskScore,
    'kibana.alert.status': 'active',
    'kibana.alert.workflow_status': 'open',
    'kibana.alert.depth': 1,
    'kibana.alert.reason': reason,
    'kibana.alert.uuid': seededId,
    'kibana.space_ids': [spaceId],
  };
  const hostName = alert.fields['host.name'];
  return toNestedSource(
    {
      ...base,
      // Endpoint alerts carry only `host.name`; the review joins raw events on `host.id`.
      ...(withHostId && hostName !== undefined && alert.fields['host.id'] === undefined
        ? { 'host.id': hostIdFor(String(hostName)) }
        : {}),
      ...alert.fields,
      '@timestamp': timestamp,
      'kibana.alert.original_time': timestamp,
      tags: [runMarker],
      'kibana.alert.uuid': seededId,
      'kibana.space_ids': [spaceId],
    },
    isFlatAlertField
  );
};

/**
 * Deletes by query and throws when the response says documents survived. `conflicts: 'proceed'`
 * keeps the delete going past a version conflict, but a response that reports conflicts or
 * failures means the space is still dirty, so it must not read as success.
 */
const deleteMatching = async ({
  esClient,
  index,
  query,
}: {
  esClient: Client;
  index: string;
  query: estypes.QueryDslQueryContainer;
}): Promise<void> => {
  const {
    failures,
    version_conflicts: versionConflicts,
    timed_out: timedOut,
    deleted,
    total,
  } = await esClient.deleteByQuery({
    index,
    query,
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
  });
  const problems = [
    (failures?.length ?? 0) > 0 ? `${failures?.length} failures` : undefined,
    (versionConflicts ?? 0) > 0 ? `${versionConflicts} version conflicts` : undefined,
    timedOut ? 'timed out' : undefined,
    deleted !== undefined && total !== undefined && deleted < total
      ? `deleted ${deleted} of ${total} matches`
      : undefined,
  ].filter((problem): problem is string => problem !== undefined);
  if (problems.length > 0) {
    throw new Error(`delete on "${index}" left documents behind (${problems.join(', ')})`);
  }
};

/**
 * When the seed bulk itself rejected (a socket hang up or a client timeout), Elasticsearch may
 * still be running it, so a missing document does not yet mean nothing will land. The delete and
 * the read-back then repeat for `UNSETTLED_REMOVE_ROUNDS` rounds, `UNSETTLED_REMOVE_PAUSE_MS` apart:
 * 8 rounds with 7 pauses, 3.5s in all.
 */
const UNSETTLED_REMOVE_ROUNDS = 8;
const UNSETTLED_REMOVE_PAUSE_MS = 500;

const isNotFound = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 404;

/** The ids among `ids` that still exist; a missing index means none do. */
const idsStillPresent = async ({
  esClient,
  index,
  ids,
}: {
  esClient: Client;
  index: string;
  ids: string[];
}): Promise<string[]> => {
  try {
    const { docs } = await esClient.mget({ index, ids, _source: false });
    return docs.flatMap((doc) => {
      if ('error' in doc) {
        if (doc.error.type === 'index_not_found_exception') return [];
        throw new Error(`could not read back "${doc._id}": ${JSON.stringify(doc.error)}`);
      }
      return doc.found ? [doc._id] : [];
    });
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
};

/**
 * True only when Elasticsearch refused the request on its FIRST attempt: a 4xx status and
 * `meta.meta.attempts === 0` (the transport's count of retries). The transport retries connection
 * errors, timeouts and 502/503/504, so attempt 1 may have been accepted before attempt 2 got a 429
 * or 413; any retry, or no attempts information, leaves the bulk possibly running. A 4xx a proxy
 * in front of Elasticsearch produced is out of scope.
 */
const isRefusedOnFirstAttempt = (error: unknown): boolean => {
  const { meta } = (error ?? {}) as {
    meta?: { statusCode?: number; meta?: { attempts?: number } };
  };
  const status = meta?.statusCode;
  return typeof status === 'number' && status >= 400 && status < 500 && meta?.meta?.attempts === 0;
};

/**
 * Deletes a partly written seed's alerts by exact document id, then reads the ids back. A delete
 * by query only matches documents that are already searchable, and after a transport-level failure
 * of the seed bulk some may be indexed but not refreshed; a delete by id reaches those and touches
 * nothing else. A missing document or index (404) is the expected outcome for ids never written.
 *
 * - `bulkSettled`: the seed bulk returned (with rejected items) or failed after it returned, so
 *   nothing of this seed is still in flight. One delete and one read-back; ids that remain throw.
 * - not settled: the bulk itself rejected (a transport failure, a 5xx, or a 4xx that followed a
 *   transport retry; only a 4xx on the first attempt counts as settled) and may still be running
 *   in Elasticsearch. A first empty read-back proves nothing, so the delete and read-back repeat
 *   for the whole `UNSETTLED_REMOVE_ROUNDS` window (3.5s), and the seed is called clean only if
 *   the read-back of the LAST round finds no id (a write that landed earlier was deleted by a
 *   later round). Ids found then throw. One last pass per window instead of consecutive clean
 *   reads keeps the total fixed. A write that lands after the window is not removed here; the
 *   final clean-space check after the last row (`assertCleanSpace` in `createEvaluateDataset`,
 *   which runs after every row has finished because a row's failure is recorded, not thrown) and
 *   the next row's own check report it.
 */
const removeSeededAlertsById = async ({
  esClient,
  seeded: { spaceId, goldIdBySeededId },
  bulkSettled,
  wait,
}: {
  esClient: Client;
  seeded: SeededScenario;
  bulkSettled: boolean;
  wait: (ms: number) => Promise<void>;
}): Promise<void> => {
  const index = alertsIndexForSpace(spaceId);
  const ids = [...goldIdBySeededId.keys()];
  if (ids.length === 0) {
    return;
  }
  const rounds = bulkSettled ? 1 : UNSETTLED_REMOVE_ROUNDS;
  let remaining = ids;
  for (let round = 1; round <= rounds; round++) {
    const operations = ids.map((_id) => ({ delete: { _index: index, _id } }));
    const { items } = await esClient.bulk({ refresh: true, operations });
    const failed = items.flatMap(({ delete: result }) =>
      result?.error && result.status !== 404 ? [result.error] : []
    );
    if (failed.length > 0) {
      throw new Error(
        `${failed.length} of ${ids.length} seeded alerts could not be deleted: ${JSON.stringify(
          failed[0]
        )}`
      );
    }
    remaining = await idsStillPresent({ esClient, index, ids });
    if (round < rounds) {
      await wait(UNSETTLED_REMOVE_PAUSE_MS);
    }
  }
  if (remaining.length > 0) {
    throw new Error(
      `${remaining.length} of ${ids.length} seeded alerts still exist after ${rounds} delete ${
        rounds === 1 ? 'round' : 'rounds'
      }`
    );
  }
};

/**
 * Deletes a seed's world documents by exact `_id`. A delete by query on the ids reaches an alias
 * and a data stream alike, which a delete by id does not.
 */
const removeWorldDocs = async ({
  esClient,
  seeded: { worldDocs },
}: {
  esClient: Client;
  seeded: SeededScenario;
}): Promise<void> => {
  const idsByIndex = new Map<string, string[]>();
  for (const { index, id } of worldDocs) {
    idsByIndex.set(index, [...(idsByIndex.get(index) ?? []), id]);
  }
  await Promise.all(
    [...idsByIndex].map(([index, ids]) =>
      deleteMatching({ esClient, index, query: { ids: { values: ids } } })
    )
  );
};

const DATA_STREAMS_ONLY = /creates data streams only/;
const ALREADY_EXISTS = /resource_already_exists_exception/;

/**
 * Creates `index` with keyword host and user fields. On a stack where the `logs` template is present
 * but the endpoint package is not, the endpoint event names match a template that creates data
 * streams only, and a plain create is refused. No template simulation response reports `data_stream`,
 * so that refusal is the signal: the name is created as a data stream instead, whose `ecs@mappings`
 * dynamic templates map the strings to `keyword` (`assertWorldSearchable` proves that after the bulk).
 */
const createWorldIndex = async ({
  esClient,
  log,
  index,
}: {
  esClient: Client;
  log: ToolingLog;
  index: string;
}): Promise<void> => {
  try {
    await esClient.indices.create({
      index,
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          'host.id': { type: 'keyword' },
          'host.name': { type: 'keyword' },
          'user.name': { type: 'keyword' },
        },
      },
    });
    log.info(`[ad-worker] created world index ${index} with keyword host and user fields`);
  } catch (error) {
    const message = errorMessage(error);
    // A concurrent seed may have created it between the existence check and this call.
    if (ALREADY_EXISTS.test(message)) return;
    if (!DATA_STREAMS_ONLY.test(message)) throw error;
    log.info(`[ad-worker] ${index} matches a data stream template; creating a data stream`);
    await esClient.indices.createDataStream({ name: index }).catch((createError) => {
      if (!ALREADY_EXISTS.test(errorMessage(createError))) throw createError;
    });
  }
};

/**
 * The review filters the world with `terms` on `host.id` and `user.name`. A plain index that the bulk
 * auto-creates maps those strings as analysed `text`, where a `terms` query for `ws-fin-214-id` never
 * matches its tokens, so the world would be written yet invisible. An index that already exists (the
 * entity store alias, or a data stream the endpoint package installed) keeps its own mapping.
 */
const ensureWorldIndices = async ({
  esClient,
  log,
  worldDocs,
}: {
  esClient: Client;
  log: ToolingLog;
  worldDocs: WorldDoc[];
}): Promise<void> => {
  for (const index of new Set(worldDocs.map((doc) => doc.index))) {
    if (!(await esClient.indices.exists({ index }))) {
      await createWorldIndex({ esClient, log, index });
    }
  }
};

/** How many of `docs` a `terms` query on `key` finds, using the values the docs were written with. */
const countMatchingKey = async ({
  esClient,
  index,
  key,
  docs,
}: {
  esClient: Client;
  index: string;
  key: string;
  docs: WorldDoc[];
}): Promise<number> => {
  const withKey = docs.filter(({ body }) => body[key] !== undefined);
  if (withKey.length === 0) return 0;
  const { count } = await esClient.count({
    index,
    query: {
      bool: {
        filter: [
          { ids: { values: withKey.map(({ id }) => id) } },
          { terms: { [key]: [...new Set(withKey.map(({ body }) => String(body[key])))] } },
        ],
      },
    },
  });
  return count;
};

/**
 * The review reads the world by `host.id` (and `user.name` for user entities) over
 * `entities-latest-<space>` and `logs-endpoint.events.*`. A world that was accepted by the bulk but is
 * not searchable by those keys makes every verdict `inconclusive`, so the seed proves it: each world
 * document must be found by id, and by the key the review filters it on (`host.id` when it has one,
 * `user.name` otherwise).
 */
const assertWorldSearchable = async ({
  esClient,
  log,
  scenarioId,
  worldDocs,
}: {
  esClient: Client;
  log: ToolingLog;
  scenarioId: string;
  worldDocs: WorldDoc[];
}): Promise<void> => {
  const docsByIndex = new Map<string, WorldDoc[]>();
  for (const doc of worldDocs) {
    docsByIndex.set(doc.index, [...(docsByIndex.get(doc.index) ?? []), doc]);
  }
  for (const [index, docs] of docsByIndex) {
    const ids = docs.map(({ id }) => id);
    const { count } = await esClient.count({ index, query: { ids: { values: ids } } });
    const failures: string[] = [];
    if (count !== ids.length) failures.push(`${count}/${ids.length} found by id`);
    // A doc is filtered on `host.id` when it has one; only the rest are checked by `user.name`.
    const byKey: Array<[string, WorldDoc[]]> = [
      ['host.id', docs.filter(({ body }) => body['host.id'] !== undefined)],
      ['user.name', docs.filter(({ body }) => body['host.id'] === undefined)],
    ];
    for (const [key, keyed] of byKey) {
      const matched = await countMatchingKey({ esClient, index, key, docs: keyed });
      log.info(`[ad-worker] world ${index}: ${matched}/${keyed.length} matched by ${key}`);
      if (matched !== keyed.length) failures.push(`${matched}/${keyed.length} match by ${key}`);
    }
    if (failures.length > 0) {
      throw new Error(
        `Seeding "${scenarioId}": world documents in ${index}: ${failures.join(
          ', '
        )}; the review would read an empty world`
      );
    }
  }
};

/**
 * Creates the space's ad-hoc discovery index the way the rule registry would (a `-000001` backing
 * index with the `default` namespace template's mappings, the space's alias as write index) when it
 * is missing. The registry keeps one template per namespace and none exists for the eval space yet.
 * It installs the index lazily, and a bulk into a space without one auto-creates it with dynamic
 * mappings, so the review's `_find` read fails with `all shards failed`.
 *
 * Cleanup leaves it in place: deleting it could leave the registry's cached writer
 * (`require_alias: true`) pointing at a missing alias, and a later product Attack Discovery persist
 * in this space would fail until Kibana restarts. An empty index is harmless to the rows:
 * `assertCleanSpace` counts open discoveries, not indices, and this function is a no-op once the
 * alias exists. The backing index name mirrors the registry's (`.internal${baseName}` plus
 * `-000001`, see `rule_data_plugin_service/index_info.ts`).
 */
const ADHOC_DEFAULT_BACKING_INDEX = `.internal${attackDiscoveryIndexForSpace('default')}-000001`;

const ensureDiscoveryIndex = async ({
  esClient,
  log,
  spaceId,
}: {
  esClient: Client;
  log: ToolingLog;
  spaceId: string;
}): Promise<void> => {
  const alias = attackDiscoveryIndexForSpace(spaceId);
  if (await esClient.indices.exists({ index: alias })) return;
  const { template } = await esClient.indices.simulateIndexTemplate({
    name: ADHOC_DEFAULT_BACKING_INDEX,
  });
  try {
    await esClient.indices.create({
      index: `.internal${alias}-000001`,
      mappings: template.mappings,
      settings: {
        index: {
          number_of_shards: 1,
          auto_expand_replicas: '0-1',
          hidden: true,
          mapping: template.settings?.index?.mapping,
        },
      },
      aliases: { [alias]: { is_write_index: true } },
    });
    log.info(`[ad-worker] created discovery index ${alias} from the default namespace template`);
  } catch (error) {
    // A concurrent seed or a real discovery write may have created it in between.
    if (!ALREADY_EXISTS.test(errorMessage(error))) throw error;
  }
};

/** Writes one scenario's alerts into the space's alerts index under a fresh run marker. */
export const seedScenario = async ({
  esClient,
  log,
  scenario,
  spaceId,
  now = Date.now(),
  wait = sleep,
}: {
  esClient: Client;
  log: ToolingLog;
  scenario: AuditScenario;
  spaceId: string;
  now?: number;
  /** Pause between rounds of removing a failed seed; injected so tests do not wait. */
  wait?: (ms: number) => Promise<void>;
}): Promise<SeededScenario> => {
  await healSpace({ esClient, spaceId, log, wait });
  const runMarker = newRunMarker(scenario.id);
  const timestamps = rescaleTimestamps({ alerts: scenario.alerts, now });
  const goldIdBySeededId = new Map<string, string>();
  const operations = scenario.alerts.flatMap((alert) => {
    const seededId = `${runMarker}-${alert.id}`;
    goldIdBySeededId.set(seededId, alert.id);
    return [
      { index: { _index: alertsIndexForSpace(spaceId), _id: seededId } },
      buildSeededAlert({
        alert,
        seededId,
        runMarker,
        spaceId,
        timestampMs: timestamps.get(alert.id) ?? now - SEED_WINDOW_MS,
        withHostId: hasWorld(scenario.id),
      }),
    ];
  });
  const anchorMsByHost = new Map<string, number>();
  for (const alert of scenario.alerts) {
    const host = alert.fields['host.name'];
    const at = timestamps.get(alert.id);
    if (host !== undefined && at !== undefined) {
      anchorMsByHost.set(String(host), Math.min(at, anchorMsByHost.get(String(host)) ?? at));
    }
  }
  const world = buildWorld({ scenarioId: scenario.id, runMarker, spaceId, anchorMsByHost });
  // Events are written with `create` so a data stream (when the endpoint package is installed)
  // accepts them; the entity store index takes `index`. Nested like the real entity store and
  // endpoint events, because the review grounds entity claims on `_source.entity.id`.
  const worldOperations = world.flatMap(({ kind, id, index, body }) => [
    { [kind === 'event' ? 'create' : 'index']: { _index: index, _id: id } },
    toNestedSource(body),
  ]);
  // Cites the first four seeded alerts by their full `_id`s.
  const seededDiscovery =
    scenario.id === SEEDED_FALSE_POSITIVE_SCENARIO_ID
      ? buildSeededFalsePositiveDiscovery({
          runMarker,
          spaceId,
          seededAlertIds: [...goldIdBySeededId.keys()],
          timestampMs: Math.max(0, ...timestamps.values(), 0),
        })
      : undefined;
  const discoveryOperations = seededDiscovery
    ? [
        { index: { _index: attackDiscoveryIndexForSpace(spaceId), _id: seededDiscovery.id } },
        toNestedSource(seededDiscovery.doc, isFlatAlertField),
      ]
    : [];
  const seeded: SeededScenario = {
    runMarker,
    spaceId,
    goldIdBySeededId,
    alertCount: scenario.alerts.length,
    worldDocs: world.map(({ index, id }) => ({ index, id })),
    ...(seededDiscovery ? { seededDiscoveryId: seededDiscovery.id } : {}),
    openAlertIds: [],
  };
  // The caller only receives `seeded` when this resolves, so it cannot clean up a seed that fails
  // midway. A bulk with some rejected items, or a failed read, has already left alerts behind and
  // the next row would fail `assertCleanSpace`. This seed's alerts are removed, by id because a
  // transport failure can leave them unsearchable, along with its world documents by `_id` and
  // the seeded discovery: the workflow has not started, so there are no fingerprints or reviews of
  // this row to delete. `bulkSettled` is false only when the bulk
  // call itself rejected and was not refused on its first attempt (a retry may have been accepted
  // before the 4xx), the case where it may still be running in Elasticsearch.
  let bulkSettled = false;
  try {
    await ensureWorldIndices({ esClient, log, worldDocs: world });
    if (seededDiscovery) await ensureDiscoveryIndex({ esClient, log, spaceId });
    let response: Awaited<ReturnType<Client['bulk']>>;
    try {
      response = await esClient.bulk({
        refresh: 'wait_for',
        operations: [...operations, ...discoveryOperations, ...worldOperations],
      });
    } catch (bulkError) {
      // A 4xx on the first attempt is Elasticsearch refusing the request before it ran anything.
      bulkSettled = isRefusedOnFirstAttempt(bulkError);
      throw bulkError;
    }
    bulkSettled = true;
    if (response.errors) {
      // Events go in with `create`, so a rejected item carries its error under `create`, not `index`.
      const failed = response.items
        .map((item) => item.index?.error ?? item.create?.error)
        .find((error) => error !== undefined);
      throw new Error(`Seeding "${scenario.id}" failed: ${JSON.stringify(failed)}`);
    }
    await assertWorldSearchable({ esClient, log, scenarioId: scenario.id, worldDocs: world });
    const open = await esClient.search({
      index: alertsIndexForSpace(spaceId),
      query: { term: { 'kibana.alert.workflow_status': 'open' } },
      _source: false,
      size: 10_000,
    });
    seeded.openAlertIds = open.hits.hits.map(
      ({ _id }) => goldIdBySeededId.get(String(_id)) ?? String(_id)
    );
  } catch (seedError) {
    try {
      await removeSeededAlertsById({ esClient, seeded, bulkSettled, wait });
      await removeWorldDocs({ esClient, seeded });
      // The workflow has not started, so no fingerprints or discoveries of this row exist, except
      // the seeded discovery itself, which the same bulk wrote and a failed seed must remove.
      if (seeded.seededDiscoveryId !== undefined) {
        await deleteMatching({
          esClient,
          index: attackDiscoveryIndexForSpace(spaceId),
          query: { ids: { values: [seeded.seededDiscoveryId] } },
        });
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [seedError, cleanupError],
        `Seeding "${scenario.id}" failed (${errorMessage(
          seedError
        )}) and the partial seed could not be removed (${errorMessage(cleanupError)})`
      );
    }
    throw seedError;
  }
  log.info(
    `[ad-worker] seeded ${scenario.alerts.length} alerts and ${world.length} world documents for "${scenario.id}" (${runMarker})`
  );
  return seeded;
};

/**
 * Rounds of delete and recount before a space is given up on. Steps of the previous row can still
 * write after its cleanup (the fingerprint match indexes without a refresh), so one delete is not
 * proof the space stays clean.
 */
export const CLEANUP_ROUNDS = 6;
const CLEANUP_INTERVAL_MS = 5_000;

interface SpaceTarget {
  what: string;
  index: string;
  query: estypes.QueryDslQueryContainer;
}

const OPEN = { term: { 'kibana.alert.workflow_status': 'open' } };

/** What a row must not find in its space: each would be analyzed or matched with its own seed. */
const spaceLeftovers = (spaceId: string): SpaceTarget[] => [
  { what: 'open alerts', index: alertsIndexForSpace(spaceId), query: OPEN },
  {
    what: 'attack fingerprints',
    index: ATTACK_FINGERPRINT_INDEX,
    query: { term: { 'attributes.space_id': spaceId } },
  },
  { what: 'open attack discoveries', index: attackDiscoveryIndexForSpace(spaceId), query: OPEN },
];

const countTargets = async (
  esClient: Client,
  targets: readonly SpaceTarget[]
): Promise<Array<{ what: string; count: number }>> =>
  Promise.all(
    targets.map(async ({ what, index, query }) => ({
      what,
      count: (await esClient.count({ index, query, ignore_unavailable: true })).count,
    }))
  );

const describeCounts = (counts: ReadonlyArray<{ what: string; count: number }>): string => {
  const parts = counts.map(({ what, count }) => `${count} ${what}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
};

const dirtySpaceError = (
  spaceId: string,
  when: string,
  counts: ReadonlyArray<{ what: string; count: number }>
): Error =>
  new Error(
    `Space "${spaceId}" is not clean ${when}: ${describeCounts(
      counts
    )} are left in it (leftovers of an earlier run, or writes that landed late).`
  );

/**
 * Fails when the space holds open alerts, attack fingerprints or open attack discoveries. A row
 * only measures its own seed if nothing else is in the space: a leftover alert would be analyzed
 * with it, and a leftover fingerprint would make an attack match instead of being reviewed.
 */
export const assertCleanSpace = async ({
  esClient,
  spaceId,
  when = 'before the row',
}: {
  esClient: Client;
  spaceId: string;
  /** Where in the run the check happens, for the error message. */
  when?: string;
}): Promise<void> => {
  const counts = await countTargets(esClient, spaceLeftovers(spaceId));
  if (counts.some(({ count }) => count > 0)) {
    throw dirtySpaceError(spaceId, when, counts);
  }
};

/**
 * Brings the space to clean before a row. Leftovers are deleted with a warning: the eval space is
 * the suite's own, and the usual source is a late write of the previous row that landed after its
 * cleanup. A space that is still dirty after `CLEANUP_ROUNDS` checks fails the row.
 */
const healSpace = async ({
  esClient,
  spaceId,
  log,
  wait,
}: {
  esClient: Client;
  spaceId: string;
  log: ToolingLog;
  wait: (ms: number) => Promise<void>;
}): Promise<void> => {
  const targets = spaceLeftovers(spaceId);
  for (let round = 1; ; round++) {
    const counts = await countTargets(esClient, targets);
    if (counts.every(({ count }) => count === 0)) return;
    if (round === CLEANUP_ROUNDS) throw dirtySpaceError(spaceId, 'before the row', counts);
    log.warning(
      `[ad-worker] space "${spaceId}" is not clean before the row (${describeCounts(
        counts
      )}); deleting them (round ${round} of ${CLEANUP_ROUNDS})`
    );
    const results = await Promise.allSettled(
      targets.map(({ index, query }) => deleteMatching({ esClient, index, query }))
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        log.warning(
          `[ad-worker] could not delete ${targets[index].what}: ${errorMessage(result.reason)}`
        );
      }
    });
    await wait(CLEANUP_INTERVAL_MS);
  }
};

/**
 * Removes a seed's alerts, the space's fingerprints so the next row cannot match an attack from
 * this one, and the space's persisted discoveries. Every delete is attempted, then the indices are
 * refreshed and recounted; a failed delete or a document written meanwhile starts another round,
 * and whatever is left after `CLEANUP_ROUNDS` is thrown, because a space left dirty would poison
 * the next row. Alerts match exactly by run marker (they are searchable here, the seed bulk waited
 * for a refresh). A seed that failed before the workflow ran removes its alerts, by id, its world
 * documents by `_id` and the seeded discovery (see `seedScenario`).
 */
export const cleanupSeed = async ({
  esClient,
  seeded,
  wait = sleep,
}: {
  esClient: Client;
  seeded: SeededScenario;
  /** Pause between rounds; injected so tests do not wait. */
  wait?: (ms: number) => Promise<void>;
}): Promise<void> => {
  const { spaceId, runMarker } = seeded;
  const targets: SpaceTarget[] = [
    {
      what: 'seeded alerts',
      index: alertsIndexForSpace(spaceId),
      query: { term: { tags: runMarker } },
    },
    {
      what: 'fingerprints',
      index: ATTACK_FINGERPRINT_INDEX,
      query: { term: { 'attributes.space_id': spaceId } },
    },
    {
      what: 'persisted discoveries',
      index: attackDiscoveryIndexForSpace(spaceId),
      query: { match_all: {} },
    },
    {
      // Investigations are Agent Builder conversations in the shared `.chat-conversations` index
      // (top-level `space` keyword); the review derives the id from the attack discovery id
      // (`investigationIdFor` in collect.ts). Its side documents (subjects/impact/hypotheses)
      // live in separate indexes keyed by conversationId and are scoped with the same space id.
      what: 'investigations (conversations)',
      index: CONVERSATIONS_INDEX,
      query: { term: { space: spaceId } },
    },
    {
      what: 'investigation side documents',
      index: INVESTIGATION_SIDE_INDEX,
      query: { term: { spaceId } },
    },
    {
      what: 'proposals',
      index: PROPOSALS_INDEX_NAME,
      query: { term: { spaceId } },
    },
  ];
  const [alerts, fingerprints, discoveries, conversations, sideDocs, proposals] = targets;
  const deletions: Array<{ what: string; run: () => Promise<void> }> = [
    ...[alerts, fingerprints].map(({ what, index, query }) => ({
      what,
      run: () => deleteMatching({ esClient, index, query }),
    })),
    ...(seeded.worldDocs.length > 0
      ? [{ what: 'world documents', run: () => removeWorldDocs({ esClient, seeded }) }]
      : []),
    {
      what: discoveries.what,
      run: () => deleteMatching({ esClient, index: discoveries.index, query: discoveries.query }),
    },
    {
      what: conversations.what,
      run: () =>
        deleteMatching({ esClient, index: conversations.index, query: conversations.query }),
    },
    {
      what: sideDocs.what,
      run: () => deleteMatching({ esClient, index: sideDocs.index, query: sideDocs.query }),
    },
    {
      what: proposals.what,
      run: () => deleteMatching({ esClient, index: proposals.index, query: proposals.query }),
    },
  ];
  let problems: Error[] = [];
  for (let round = 1; round <= CLEANUP_ROUNDS; round++) {
    if (round > 1) await wait(CLEANUP_INTERVAL_MS);
    const results = await Promise.allSettled(deletions.map(({ run }) => run()));
    problems = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [new Error(`could not delete ${deletions[index].what}: ${errorMessage(result.reason)}`)]
        : []
    );
    if (problems.length === 0) {
      try {
        await esClient.indices.refresh({
          index: targets.map(({ index }) => index),
          ignore_unavailable: true,
        });
        const left = (await countTargets(esClient, targets)).filter(({ count }) => count > 0);
        problems = left.map(({ what, count }) => new Error(`${count} ${what} are still present`));
      } catch (error) {
        problems = [new Error(`could not recount the space: ${errorMessage(error)}`)];
      }
    }
    if (problems.length === 0) return;
  }
  throw new AggregateError(
    problems,
    `Cleanup of space "${spaceId}" failed after ${CLEANUP_ROUNDS} rounds: ${problems
      .map(({ message }) => message)
      .join('; ')}`
  );
};
