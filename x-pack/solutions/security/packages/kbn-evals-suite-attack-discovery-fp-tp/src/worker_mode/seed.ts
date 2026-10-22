/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  FP_TP_INFERENCE_FEATURE_ID,
  INFERENCE_SETTINGS_API_VERSION,
  INFERENCE_SETTINGS_ROUTE,
  PUBLIC_API_VERSION,
} from '../constants';
import { mergeFeatureOverride, type InferenceFeatureSetting } from '../inference_override';
import {
  assertBulkOk,
  FP_TP_BOOTSTRAP_RULE_ID,
  createEntity,
  deleteDocumentsById,
  deleteEntitiesOnHosts,
  deleteEntity,
  ensureFpTpSeedPrerequisites,
  kbnErrorMessage,
  writeIdentityFields,
  type FpTpLiveKbnRequest,
} from '../world';
import {
  AD_WORKFLOWS_SETTING,
  ANONYMIZATION_FIELDS_FIND_ROUTE,
  anonymizationFieldsIndexForSpace,
  UI_SETTINGS_ROUTE,
} from './constants';
import { workerModeCleanupTargets, type WorkerModeSeedPlan } from './plan';

const PREVIOUS_SEED_PAGE_SIZE = 10_000;
const DETECTION_ENGINE_API_VERSION = '2023-10-31';
const BOOTSTRAP_RULE_QUERY = 'data_stream.dataset:never-matches-fptp-seeder-bootstrap';
const ALERTS_INDEX_TIMEOUT_MS = 180_000;
const ALERTS_INDEX_POLL_INTERVAL_MS = 5_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Keeps one enabled query rule that never matches in the space. The space's alerts
 * index is created by its first rule run, not by `POST /api/detection_engine/index`,
 * which only acknowledges. Same rule as the serverless seeder (kibana#297538).
 */
export const ensureBootstrapNoMatchRule = async (kbnRequest: FpTpLiveKbnRequest): Promise<void> => {
  const existing = await kbnRequest({
    method: 'GET',
    path: `/api/detection_engine/rules?rule_id=${FP_TP_BOOTSTRAP_RULE_ID}`,
    version: DETECTION_ENGINE_API_VERSION,
  });
  if (existing.statusCode < 400) {
    return;
  }
  if (existing.statusCode !== 404) {
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
      description: 'Always-on no-match rule that provisions the alerts index.',
      type: 'query',
      language: 'lucene',
      max_signals: 1,
      threat: [],
    },
  });
  if (created.statusCode >= 400 && created.statusCode !== 409) {
    throw new Error(
      `Failed to create bootstrap rule (${created.statusCode}): ${kbnErrorMessage(created.body)}`
    );
  }
};

/**
 * Creates the dedicated space when it does not exist yet and returns whether it did.
 * `kbnRequest` must not be scoped to that space. Seeding a missing space is not
 * rejected by Kibana: the Entity Store install half-runs there and stays `installing`.
 */
export const ensureWorkerModeSpace = async (
  kbnRequest: FpTpLiveKbnRequest,
  space: string
): Promise<boolean> => {
  const existing = await kbnRequest({
    method: 'GET',
    path: `/api/spaces/space/${encodeURIComponent(space)}`,
  });
  if (existing.statusCode < 400) {
    return false;
  }
  if (existing.statusCode !== 404) {
    throw new Error(
      `Failed to look up space ${space} (${existing.statusCode}): ${kbnErrorMessage(existing.body)}`
    );
  }
  const created = await kbnRequest({
    method: 'POST',
    path: '/api/spaces/space',
    body: { id: space, name: space },
  });
  if (created.statusCode >= 400 && created.statusCode !== 409) {
    throw new Error(
      `Failed to create space ${space} (${created.statusCode}): ${kbnErrorMessage(created.body)}`
    );
  }
  return created.statusCode < 400;
};

export const waitForAlertsIndex = async (
  esClient: EsClient,
  index: string,
  timeoutMs: number = ALERTS_INDEX_TIMEOUT_MS
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await esClient.indices.exists({ index })) {
      return;
    }
    await sleep(ALERTS_INDEX_POLL_INTERVAL_MS);
  }
  throw new Error(`Detection alerts index ${index} did not appear within ${timeoutMs}ms`);
};

const readInferenceFeatures = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<InferenceFeatureSetting[]> => {
  const response = await kbnRequest({
    method: 'GET',
    path: INFERENCE_SETTINGS_ROUTE,
    version: INFERENCE_SETTINGS_API_VERSION,
  });
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to read inference settings (${response.statusCode}): ${kbnErrorMessage(
        response.body
      )}`
    );
  }
  const features = (response.body as { data?: { features?: unknown } } | undefined)?.data?.features;
  return Array.isArray(features) ? (features as InferenceFeatureSetting[]) : [];
};

/**
 * Makes sure the space maps the `alertzero_frontier` feature, which both generation and
 * the FP/TP analysis resolve their connector from. With `connectorId` the mapping is set
 * (other features are kept); without it an existing mapping is required. Returns the
 * mapped connector id.
 */
export const ensureReasoningMapping = async (
  kbnRequest: FpTpLiveKbnRequest,
  connectorId?: string
): Promise<string> => {
  const features = await readInferenceFeatures(kbnRequest);
  const mapped = features.find(({ feature_id: id }) => id === FP_TP_INFERENCE_FEATURE_ID)
    ?.endpoints?.[0]?.id;
  if (connectorId === undefined || connectorId === mapped) {
    if (mapped === undefined) {
      throw new Error(
        `The space maps no connector to ${FP_TP_INFERENCE_FEATURE_ID}. Pass ` +
          '--reasoningConnectorId, or pick one in Stack Management → Feature Settings.'
      );
    }
    return mapped;
  }
  const response = await kbnRequest({
    method: 'PUT',
    path: INFERENCE_SETTINGS_ROUTE,
    version: INFERENCE_SETTINGS_API_VERSION,
    body: {
      features: mergeFeatureOverride(features, FP_TP_INFERENCE_FEATURE_ID, connectorId),
    },
  });
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to map ${FP_TP_INFERENCE_FEATURE_ID} to ${connectorId} (${
        response.statusCode
      }): ${kbnErrorMessage(response.body)}`
    );
  }
  return connectorId;
};

/**
 * Generation reads the space's anonymization-fields index directly, and only an AI
 * Assistant route creates it, so in a fresh space every Worker run fails
 * (security-team#20129). Any request that builds the assistant data client installs it.
 */
export const ensureAnonymizationFields = async (
  esClient: EsClient,
  kbnRequest: FpTpLiveKbnRequest,
  space: string
): Promise<void> => {
  const response = await kbnRequest({
    method: 'GET',
    path: `${ANONYMIZATION_FIELDS_FIND_ROUTE}?per_page=1`,
    version: PUBLIC_API_VERSION,
  });
  if (response.statusCode >= 400) {
    throw new Error(
      `Failed to read anonymization fields (${response.statusCode}): ${kbnErrorMessage(
        response.body
      )}`
    );
  }
  const index = anonymizationFieldsIndexForSpace(space);
  if (!(await esClient.indices.exists({ index }))) {
    throw new Error(
      `${index} is still missing. Open Attack discovery once in space "${space}", then retry.`
    );
  }
};

/**
 * Turns on the space's Attack Discovery workflows Advanced Setting. It is off in a new
 * space, and generation then fails every batch while the Worker run still completes.
 */
export const ensureAttackDiscoveryWorkflowsSetting = async (
  kbnRequest: FpTpLiveKbnRequest
): Promise<void> => {
  const current = await kbnRequest({ method: 'GET', path: UI_SETTINGS_ROUTE });
  if (current.statusCode >= 400) {
    throw new Error(
      `Failed to read Advanced Settings (${current.statusCode}): ${kbnErrorMessage(current.body)}`
    );
  }
  const setting = (
    current.body as { settings?: Record<string, { userValue?: unknown }> } | undefined
  )?.settings?.[AD_WORKFLOWS_SETTING];
  if (setting?.userValue === true) {
    return;
  }
  const updated = await kbnRequest({
    method: 'POST',
    path: UI_SETTINGS_ROUTE,
    body: { changes: { [AD_WORKFLOWS_SETTING]: true } },
  });
  if (updated.statusCode >= 400) {
    throw new Error(
      `Failed to enable ${AD_WORKFLOWS_SETTING} (${updated.statusCode}): ${kbnErrorMessage(
        updated.body
      )}`
    );
  }
};

/**
 * One-time setup for a worker-mode seed: the detection alerts index (through a no-match
 * rule that stays enabled in the space), the Attack Discovery workflows setting, an
 * installed Entity Store with extraction stopped (it would otherwise build entities from the seeded
 * events), the reasoning mapping and the anonymization fields. Extraction stays stopped
 * afterwards, because the Worker reads the entities long after seeding. Returns the
 * reasoning connector id.
 */
export const ensureWorkerModePrerequisites = async ({
  esClient,
  kbnRequest,
  space,
  reasoningConnectorId,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  space: string;
  reasoningConnectorId?: string;
}): Promise<string> => {
  await ensureFpTpSeedPrerequisites(kbnRequest);
  await ensureAttackDiscoveryWorkflowsSetting(kbnRequest);
  const connectorId = await ensureReasoningMapping(kbnRequest, reasoningConnectorId);
  await ensureAnonymizationFields(esClient, kbnRequest, space);
  await ensureBootstrapNoMatchRule(kbnRequest);
  await waitForAlertsIndex(esClient, workerModeCleanupTargets(space).alertsIndex);
  return connectorId;
};

export interface WorkerModeCleanupSummary {
  readonly alerts: number;
  readonly hostIds: readonly string[];
}

/**
 * Deletes what earlier worker-mode seeds left in `space`: their alerts (found by the
 * seed label in `tags`), the raw events on those alerts' hosts in every namespace, and
 * the entities on those hosts. Generation reads every open alert in the space, so a
 * leftover alert would be folded into the next attack.
 */
export const cleanupWorkerModeSpace = async ({
  esClient,
  kbnRequest,
  space,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  space: string;
}): Promise<WorkerModeCleanupSummary> => {
  const targets = workerModeCleanupTargets(space);
  const previous = await esClient.search<{ host?: { id?: unknown } }>({
    index: targets.alertsIndex,
    ignore_unavailable: true,
    size: PREVIOUS_SEED_PAGE_SIZE,
    _source: ['host.id'],
    query: targets.seededAlertsQuery,
  });
  const hostIds = [
    ...new Set(
      previous.hits.hits
        .map(({ _source: source }) => source?.host?.id)
        .filter((id): id is string => typeof id === 'string')
    ),
  ];

  if (hostIds.length > 0) {
    await esClient.deleteByQuery({
      index: targets.eventsIndexPattern,
      query: { terms: { 'host.id': hostIds } },
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    await deleteEntitiesOnHosts(esClient, kbnRequest, hostIds, targets.entityReadAlias);
  }
  if (previous.hits.hits.length > 0) {
    await esClient.deleteByQuery({
      index: targets.alertsIndex,
      query: targets.seededAlertsQuery,
      conflicts: 'proceed',
      refresh: true,
    });
  }
  return { alerts: previous.hits.hits.length, hostIds };
};

/** Deletes exactly what `plan` wrote. */
export const cleanupWorkerModePlan = async ({
  esClient,
  kbnRequest,
  plan,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  plan: WorkerModeSeedPlan;
}): Promise<void> => {
  await deleteDocumentsById(esClient, [
    ...plan.alertIds.map((id) => ({ index: plan.alertsIndex, id })),
    ...plan.events,
  ]);
  for (const entity of plan.entities) {
    await deleteEntity(kbnRequest, entity.entityId);
  }
  await deleteEntitiesOnHosts(esClient, kbnRequest, plan.hostIds, plan.entityReadAlias);
};

/**
 * Writes the plan's alerts, raw events and entities. Call `ensureWorkerModePrerequisites`
 * and `cleanupWorkerModeSpace` first. A partial seed is removed before the error is
 * rethrown.
 */
export const seedWorkerModePlan = async ({
  esClient,
  kbnRequest,
  plan,
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  plan: WorkerModeSeedPlan;
}): Promise<void> => {
  try {
    assertBulkOk(
      'alerts',
      await esClient.bulk({ refresh: 'wait_for', operations: plan.alertOperations })
    );
    if (plan.eventOperations.length > 0) {
      assertBulkOk(
        'events',
        await esClient.bulk({ refresh: 'wait_for', operations: plan.eventOperations })
      );
    }
    for (const entity of plan.entities) {
      await createEntity(kbnRequest, entity);
      await writeIdentityFields(esClient, entity, plan.entityReadAlias);
    }
  } catch (error) {
    await cleanupWorkerModePlan({ esClient, kbnRequest, plan }).catch(() => undefined);
    throw error;
  }
};
