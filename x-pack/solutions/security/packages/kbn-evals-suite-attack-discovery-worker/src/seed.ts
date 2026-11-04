/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AuditAlert, AuditScenario } from './audit_failure_classes/types';
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

/** Index holding the fingerprints that `match_fingerprints` compares new attacks against. */
export const ATTACK_FINGERPRINT_INDEX = 'ai-index-idx-security-attack-fingerprints';

/** A fresh marker per seed: attacks dedupe on a hash of their alert ids, so ids must be new. */
export const newRunMarker = (scenarioId: string): string =>
  `adw-${createHash('sha256')
    .update(`${scenarioId}:${Date.now()}:${Math.random()}`)
    .digest('hex')
    .slice(0, 10)}`;

const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
  if (existing.statusCode < 400) return;
  if (existing.statusCode !== 404) {
    throw new Error(`Could not read space "${spaceId}": ${kbnErrorMessage(existing.body)}`);
  }
  log.info(`[ad-worker] creating eval space "${spaceId}"`);
  const created = await request({
    method: 'POST',
    path: '/api/spaces/space',
    version: PUBLIC_API_VERSION,
    body: { id: spaceId, name: spaceId, disabledFeatures: [] },
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

/**
 * One alert document as a flat dotted-field map, so the base fields and the scenario's own
 * dotted fields cannot collide as object-versus-leaf. The scenario's values win.
 */
export const buildSeededAlert = ({
  alert,
  seededId,
  runMarker,
  spaceId,
  timestampMs,
}: {
  alert: AuditAlert;
  seededId: string;
  runMarker: string;
  spaceId: string;
  timestampMs: number;
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
  return {
    ...base,
    ...alert.fields,
    '@timestamp': timestamp,
    'kibana.alert.original_time': timestamp,
    tags: [runMarker],
    'kibana.alert.uuid': seededId,
    'kibana.space_ids': [spaceId],
  };
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
 * or 413; any retry, or no attempts information, leaves the bulk possibly running.
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
 *   transport retry; only a 4xx on the first attempt counts as settled) and may still be running in Elasticsearch. A first empty
 *   read-back proves nothing, so the delete and read-back repeat for the whole
 *   `UNSETTLED_REMOVE_ROUNDS` window (3.5s), and the seed is called clean only if the read-back of
 *   the LAST round finds no id (a write that landed earlier was deleted by a later round). Ids
 *   found then throw. One last pass per window instead of consecutive clean reads keeps the total
 *   fixed. A write that lands after the window is not removed here; the final clean-space check
 *   after the last row (`assertCleanSpace` in `createEvaluateDataset`, which runs after every row
 *   has finished because a row's failure is recorded, not thrown) and the next row's own check
 *   report it.
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
  await assertCleanSpace({ esClient, spaceId });
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
      }),
    ];
  });
  const seeded: SeededScenario = {
    runMarker,
    spaceId,
    goldIdBySeededId,
    alertCount: scenario.alerts.length,
    openAlertIds: [],
  };
  // The caller only receives `seeded` when this resolves, so it cannot clean up a seed that fails
  // midway. A bulk with some rejected items, or a failed read, has already left alerts behind and
  // the next row would fail `assertCleanSpace`. Only this seed's alerts are removed, by id because a
  // transport failure can leave them unsearchable: the workflow has not started, so there are no
  // fingerprints or discoveries of this row to delete. `bulkSettled` is false only when the bulk
  // call itself rejected and was not refused on its first attempt (a retry may have been accepted
  // before the 4xx), the case where it may still be running in Elasticsearch.
  let bulkSettled = false;
  try {
    let response: Awaited<ReturnType<Client['bulk']>>;
    try {
      response = await esClient.bulk({ refresh: 'wait_for', operations });
    } catch (bulkError) {
      // A 4xx on the first attempt is Elasticsearch refusing the request before it ran anything.
      bulkSettled = isRefusedOnFirstAttempt(bulkError);
      throw bulkError;
    }
    bulkSettled = true;
    if (response.errors) {
      const failed = response.items.find((item) => item.index?.error)?.index?.error;
      throw new Error(`Seeding "${scenario.id}" failed: ${JSON.stringify(failed)}`);
    }
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
    `[ad-worker] seeded ${scenario.alerts.length} alerts for "${scenario.id}" (${runMarker})`
  );
  return seeded;
};

/**
 * Fails when the space already holds open alerts or attack fingerprints. A row only measures its
 * own seed if nothing else is in the space: a leftover alert would be analyzed with it, and a
 * leftover fingerprint would make an attack match instead of being reviewed.
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
  const [alerts, fingerprints] = await Promise.all([
    esClient.count({
      index: alertsIndexForSpace(spaceId),
      query: { term: { 'kibana.alert.workflow_status': 'open' } },
      ignore_unavailable: true,
    }),
    esClient.count({
      index: ATTACK_FINGERPRINT_INDEX,
      query: { term: { 'attributes.space_id': spaceId } },
      ignore_unavailable: true,
    }),
  ]);
  if (alerts.count > 0 || fingerprints.count > 0) {
    throw new Error(
      `Space "${spaceId}" is not clean ${when}: ${alerts.count} open alerts and ${fingerprints.count} attack fingerprints are left in it (leftovers of an earlier run, or writes that landed late).`
    );
  }
};

/**
 * Removes a seed's alerts, the space's fingerprints so the next row cannot match an attack from
 * this one, and the space's persisted discoveries. Every delete is attempted; any that fails is
 * thrown, because a space left dirty would poison the next row. Alerts match exactly by run marker
 * (they are searchable here, the seed bulk waited for a refresh). A seed that failed before the
 * workflow ran removes only its alerts, by id (see `seedScenario`).
 */
export const cleanupSeed = async ({
  esClient,
  seeded,
}: {
  esClient: Client;
  seeded: SeededScenario;
}): Promise<void> => {
  const { spaceId, runMarker } = seeded;
  const deletions: Array<{ what: string; run: () => Promise<void> }> = [
    {
      what: 'seeded alerts',
      run: () =>
        deleteMatching({
          esClient,
          index: alertsIndexForSpace(spaceId),
          query: { term: { tags: runMarker } },
        }),
    },
    {
      what: 'fingerprints',
      run: () =>
        deleteMatching({
          esClient,
          index: ATTACK_FINGERPRINT_INDEX,
          query: { term: { 'attributes.space_id': spaceId } },
        }),
    },
    {
      what: 'persisted discoveries',
      run: () =>
        deleteMatching({
          esClient,
          index: attackDiscoveryIndexForSpace(spaceId),
          query: { match_all: {} },
        }),
    },
  ];
  const results = await Promise.allSettled(deletions.map(({ run }) => run()));
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [new Error(`could not delete ${deletions[index].what}: ${errorMessage(result.reason)}`)]
      : []
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, `Cleanup of space "${spaceId}" failed`);
  }
};
