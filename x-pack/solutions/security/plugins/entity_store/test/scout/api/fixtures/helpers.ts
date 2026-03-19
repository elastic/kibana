/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import type { EntityType } from '../../../../common';
import { hashEuid } from '../../../../server/domain/crud/utils';
import { ENTITY_STORE_ROUTES, LATEST_INDEX, UPDATES_INDEX } from './constants';

/**
 * API client shape required by forceUserExtraction.
 * Use this instead of importing Scout's ApiClient type.
 */
export interface ForceLogExtractionApiClient {
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: unknown }>;
}

export const ingestDoc = async (esClient: EsClient, body: Record<string, unknown>) =>
  esClient.index({
    index: UPDATES_INDEX,
    refresh: 'wait_for',
    body,
  });

export const searchDocById = async (esClient: EsClient, id: string) => {
  await esClient.indices.refresh({ index: LATEST_INDEX });
  return await esClient.search({
    index: LATEST_INDEX,
    version: true,
    query: {
      bool: {
        filter: {
          term: { 'entity.id': id },
        },
      },
    },
    size: 2,
  });
};

interface SeedUserEntityOptions {
  entityId: string;
  namespace: string;
  email: string | string[];
  timestamp?: string;
}

/**
 * Seeds a user entity directly into the LATEST index with nested document
 * structure. Uses `pipeline: '_none'` to bypass the index's default ingest
 * pipeline (which may not exist in test environments).
 *
 * Uses esClient.index() instead of the CRUD API because the CRUD API nests
 * `entity` under `user.entity`, breaking automated resolution queries that
 * expect `entity.id` at the document root.
 */
export const seedUserEntity = async (
  esClient: EsClient,
  { entityId, namespace, email, timestamp }: SeedUserEntityOptions
) => {
  await esClient.index({
    index: LATEST_INDEX,
    id: hashEuid(entityId),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      entity: {
        id: entityId,
        name: entityId,
        EngineMetadata: { Type: 'user' },
        namespace,
      },
      user: {
        email,
        name: entityId,
      },
      '@timestamp': timestamp ?? new Date().toISOString(),
    },
  });
};

const RESOLVED_TO_PATH = 'entity.relationships.resolution.resolved_to';

/**
 * Polls the LATEST index until an entity's `resolved_to` field matches the
 * expected target, or until timeout. Returns the matching `_source`.
 */
export const waitForResolution = async (
  esClient: EsClient,
  entityId: string,
  expectedTarget: string,
  timeoutMs = 30_000
): Promise<Record<string, unknown>> => {
  const start = Date.now();
  let lastSource: Record<string, unknown> | undefined;

  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_INDEX });
    const response = await esClient.search({
      index: LATEST_INDEX,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });

    const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
    lastSource = source;
    if (source) {
      // Check both nested path and flat dotted key (ES update stores as flat key)
      const resolvedTo = getNestedValue(source, RESOLVED_TO_PATH) ?? source[RESOLVED_TO_PATH];
      if (resolvedTo === expectedTarget) {
        return source;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // eslint-disable-next-line no-console
  console.log(
    `[DEBUG] waitForResolution timeout for '${entityId}'. Last _source:`,
    JSON.stringify(lastSource, null, 2)
  );

  throw new Error(
    `Timed out waiting for entity '${entityId}' to resolve to '${expectedTarget}' after ${timeoutMs}ms`
  );
};

/**
 * Polls the LATEST index and asserts that an entity does NOT gain a
 * `resolved_to` value within the given timeout (shorter default for negative tests).
 */
export const assertNotResolved = async (
  esClient: EsClient,
  entityId: string,
  timeoutMs = 10_000
): Promise<void> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_INDEX });
    const response = await esClient.search({
      index: LATEST_INDEX,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });

    const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
    if (source) {
      // Check both nested path and flat dotted key (ES update stores as flat key)
      const resolvedTo = getNestedValue(source, RESOLVED_TO_PATH) ?? source[RESOLVED_TO_PATH];
      if (resolvedTo != null) {
        throw new Error(
          `Entity '${entityId}' unexpectedly resolved to '${resolvedTo}' — expected it to stay unresolved`
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

/**
 * Triggers a maintainer run by calling the async `run/{id}` endpoint.
 * The route calls `taskManager.runSoon()` — it does NOT wait for completion.
 */
export const triggerMaintainerRun = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  maintainerId = 'automated-resolution'
) => {
  const response = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_RUN(maintainerId), {
    headers,
    responseType: 'json',
    body: {},
  });
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to trigger maintainer run '${maintainerId}': ${JSON.stringify(response.body)}`
    );
  }
  return response;
};

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export const forceLogExtraction = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  entityType: EntityType,
  fromDateISO: string,
  toDateISO: string
) =>
  await apiClient.post(ENTITY_STORE_ROUTES.FORCE_LOG_EXTRACTION(entityType), {
    headers,
    responseType: 'json',
    body: { fromDateISO, toDateISO },
  });
