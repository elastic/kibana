/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { AD2_ALERTS_INDEX, AD2_SCENARIO_ALL_INDICES } from '../scenario_registry';
import { toAttackAlertDocument } from './attack_alert';
import { buildEncodedPowershellTwin } from './build_twins';
import {
  ENCODED_POWERSHELL_ATTACK_ID,
  FP_TP_ATTACK_ADHOC_INDEX,
  FP_TP_TWIN_SEED_LABEL,
} from './constants';
import { toEntityCrudRequest } from './entity_crud';
import type { FpTpEntityCrudRequest } from './entity_crud';
import { shiftTwinToNow } from './shift_timestamps';
import type { FpTpGold, FpTpTwin, FpTpTwinVariant } from './types';

export interface FpTpLiveKbnRequest {
  (options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    body?: unknown;
    version?: string;
  }): Promise<{ statusCode: number; body: unknown }>;
}

export interface FpTpLiveSeedPlan {
  readonly twin: FpTpTwin;
  readonly attackIndex: string;
  readonly attackId: string;
  readonly alertOperations: unknown[];
  readonly eventOperations: unknown[];
  readonly attackDocument: Record<string, unknown>;
  readonly entities: readonly FpTpEntityCrudRequest[];
}

export interface FpTpLiveSeedSummary {
  readonly variant: FpTpTwinVariant;
  readonly attackId: string;
  readonly attackIndex: string;
  readonly alertCount: number;
  readonly eventCount: number;
  readonly entityIds: readonly string[];
  readonly gold: FpTpGold;
}

const ENTITY_API_VERSION = '2023-10-31';
const DETECTION_ENGINE_API_VERSION = '2023-10-31';

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

export const buildEncodedPowershellLiveSeedPlan = (
  variant: FpTpTwinVariant,
  now: Date = new Date()
): FpTpLiveSeedPlan => {
  const twin = shiftTwinToNow(buildEncodedPowershellTwin(variant), now);
  const attackDocument = toAttackAlertDocument(twin.attack);

  return {
    twin,
    attackIndex: FP_TP_ATTACK_ADHOC_INDEX,
    attackId: ENCODED_POWERSHELL_ATTACK_ID,
    alertOperations: twin.alerts.flatMap((alert) => [
      { index: { _index: AD2_ALERTS_INDEX, _id: alert.id } },
      alert.source,
    ]),
    eventOperations: twin.events.flatMap((event) => [
      { create: { _index: event.index, _id: event.id } },
      event.source,
    ]),
    attackDocument,
    entities: twin.entities.map(toEntityCrudRequest),
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

const ensureEntityStoreInstalled = async (kbnRequest: FpTpLiveKbnRequest): Promise<void> => {
  const status = await kbnRequest({
    method: 'GET',
    path: '/api/security/entity_store/status',
    version: ENTITY_API_VERSION,
  });
  if (status.statusCode < 400) {
    const body = status.body as { status?: string } | undefined;
    if (body?.status === 'running' || body?.status === 'installing') {
      return;
    }
  }

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
const deleteEventsById = async (
  esClient: EsClient,
  events: readonly { index: string; id: string }[]
): Promise<void> => {
  const idsByIndex = new Map<string, string[]>();
  for (const event of events) {
    const ids = idsByIndex.get(event.index);
    if (ids === undefined) {
      idsByIndex.set(event.index, [event.id]);
    } else {
      ids.push(event.id);
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

export const cleanupEncodedPowershellTwinLive = async (
  esClient: EsClient,
  events: readonly { index: string; id: string }[] = []
): Promise<void> => {
  for (const index of [...AD2_SCENARIO_ALL_INDICES, FP_TP_ATTACK_ADHOC_INDEX]) {
    await deleteBySeedLabel(esClient, index);
  }
  await deleteEventsById(esClient, events);
};

export const seedEncodedPowershellTwinLive = async ({
  esClient,
  kbnRequest,
  variant,
  now = new Date(),
}: {
  esClient: EsClient;
  kbnRequest: FpTpLiveKbnRequest;
  variant: FpTpTwinVariant;
  now?: Date;
}): Promise<FpTpLiveSeedSummary> => {
  const plan = buildEncodedPowershellLiveSeedPlan(variant, now);

  await ensureDetectionAlertsIndex(kbnRequest);
  await ensureEntityStoreInstalled(kbnRequest);
  await cleanupEncodedPowershellTwinLive(esClient, plan.twin.events);

  for (const entity of plan.entities) {
    await deleteEntity(kbnRequest, entity.entityId);
  }

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

  try {
    await esClient.index({
      index: plan.attackIndex,
      id: plan.attackId,
      document: plan.attackDocument,
      refresh: 'wait_for',
    });
  } catch (error) {
    throw new Error(
      `Failed to index synthetic Attack Discovery into ${plan.attackIndex}. ` +
        `Open Attack Discovery in Kibana once so the adhoc index exists, then retry. ${String(
          error
        )}`
    );
  }

  for (const entity of plan.entities) {
    await createEntity(kbnRequest, entity);
  }

  return {
    variant,
    attackId: plan.attackId,
    attackIndex: plan.attackIndex,
    alertCount: plan.twin.alerts.length,
    eventCount: plan.twin.events.length,
    entityIds: plan.entities.map((entity) => entity.entityId),
    gold: plan.twin.gold,
  };
};
