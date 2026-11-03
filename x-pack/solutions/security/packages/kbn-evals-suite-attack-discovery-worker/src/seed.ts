/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
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
    if (status === 'running' || status === 'stopped') return initial;
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
 * Returns the Entity Store's status before this run, for `pauseEntityExtraction`.
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

/** Writes one scenario's alerts into the space's alerts index under a fresh run marker. */
export const seedScenario = async ({
  esClient,
  log,
  scenario,
  spaceId,
  now = Date.now(),
}: {
  esClient: Client;
  log: ToolingLog;
  scenario: AuditScenario;
  spaceId: string;
  now?: number;
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
  const response = await esClient.bulk({ refresh: 'wait_for', operations });
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
  const openAlertIds = open.hits.hits.map(
    ({ _id }) => goldIdBySeededId.get(String(_id)) ?? String(_id)
  );
  log.info(
    `[ad-worker] seeded ${scenario.alerts.length} alerts for "${scenario.id}" (${runMarker})`
  );
  return {
    runMarker,
    spaceId,
    goldIdBySeededId,
    alertCount: scenario.alerts.length,
    openAlertIds,
  };
};

/**
 * Fails when the space already holds open alerts or attack fingerprints. A row only measures its
 * own seed if nothing else is in the space: a leftover alert would be analyzed with it, and a
 * leftover fingerprint would make an attack match instead of being reviewed.
 */
export const assertCleanSpace = async ({
  esClient,
  spaceId,
}: {
  esClient: Client;
  spaceId: string;
}): Promise<void> => {
  const [alerts, fingerprints] = await Promise.all([
    esClient.count({
      index: alertsIndexForSpace(spaceId),
      query: { term: { 'kibana.alert.workflow_status': 'open' } },
      ignore_unavailable: true,
    }),
    esClient.count({
      index: ATTACK_FINGERPRINT_INDEX,
      query: { match: { 'attributes.space_id': spaceId } },
      ignore_unavailable: true,
    }),
  ]);
  if (alerts.count > 0 || fingerprints.count > 0) {
    throw new Error(
      `Space "${spaceId}" is not clean before the row: ${alerts.count} open alerts and ${fingerprints.count} attack fingerprints are left over from an earlier run.`
    );
  }
};

/**
 * Removes a seed's alerts, the space's fingerprints so the next row cannot match an attack from
 * this one, and the space's persisted discoveries. Every delete is attempted; any that fails
 * is thrown, because a space left dirty would poison the next row.
 */
export const cleanupSeed = async ({
  esClient,
  seeded,
}: {
  esClient: Client;
  seeded: SeededScenario;
}): Promise<void> => {
  const { spaceId, runMarker } = seeded;
  const deletions: Array<{ what: string; run: () => Promise<unknown> }> = [
    {
      what: 'seeded alerts',
      run: () =>
        esClient.deleteByQuery({
          index: alertsIndexForSpace(spaceId),
          query: { prefix: { tags: runMarker } },
          conflicts: 'proceed',
          refresh: true,
        }),
    },
    {
      what: 'fingerprints',
      run: () =>
        esClient.deleteByQuery({
          index: ATTACK_FINGERPRINT_INDEX,
          query: { match: { 'attributes.space_id': spaceId } },
          conflicts: 'proceed',
          refresh: true,
          ignore_unavailable: true,
        }),
    },
    {
      what: 'persisted discoveries',
      run: () =>
        esClient.deleteByQuery({
          index: attackDiscoveryIndexForSpace(spaceId),
          query: { match_all: {} },
          conflicts: 'proceed',
          refresh: true,
          ignore_unavailable: true,
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
