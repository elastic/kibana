/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';
import type { EntityType } from '@kbn/entity-store/common';

import {
  ENTITY_STORE_ROUTES,
  HISTORY_INDEX_PATTERN,
  LATEST_ALIAS,
  LATEST_INDEX,
  UPDATES_INDEX,
} from './constants';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];
type ApiClientFixture = ApiWorkerFixtures['apiClient'];
type ApiClientResponse = Awaited<ReturnType<ApiClientFixture['get']>>;

/**
 * Normalizes values that may be stored as a single keyword or as keyword[] after
 * log extraction (e.g. `entity.relationships.*` bags).
 */
export const normalizeKeywordList = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
};

/**
 * Deletes all Entity Store data indices: latest, updates, and history snapshots.
 * Call in afterAll / afterEach to prevent stale data from leaking between
 * sequential test-target runs that share the same ES cluster.
 */
export const clearEntityStoreIndices = async (esClient: EsClient) => {
  const resolved = await esClient.indices.resolveIndex({ name: HISTORY_INDEX_PATTERN });
  const historyIndices = resolved.indices.map((i) => i.name);

  const toDelete = [LATEST_INDEX, UPDATES_INDEX, ...historyIndices];
  await esClient.indices.delete({ index: toDelete, ignore_unavailable: true }, { ignore: [404] });
};

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
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  return esClient.search({
    index: LATEST_ALIAS,
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

export const seedUserEntity = async (
  esClient: EsClient,
  { entityId, namespace, email, timestamp }: SeedUserEntityOptions
) => {
  const ts = timestamp ?? new Date().toISOString();
  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(entityId),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      entity: {
        id: entityId,
        name: entityId,
        EngineMetadata: { Type: 'user' },
        namespace,
        lifecycle: {
          first_seen: ts,
          last_seen: ts,
        },
      },
      user: {
        email,
        name: entityId,
      },
      '@timestamp': ts,
    },
  });
};

interface SeedHostEntityOptions {
  entityId: string;
  /** Host FQDN written to host.name (the entity's identity under the host EUID ranking). */
  hostName: string;
  /**
   * Optional relationship raw_identifier bag to seed under
   * `entity.relationships.<relationshipKey>.raw_identifiers.host.name`. A
   * raw_identifiers-based maintainer (administers, depends_on, supervises, …)
   * resolves these into `<relationshipKey>.ids` as `host:<name>`.
   */
  relationship?: {
    /** The relationship key, e.g. 'administers' | 'depends_on' | 'supervises'. */
    key: string;
    /** Raw host names placed under raw_identifiers.host.name. */
    hostNames: string[];
  };
  /** entity.lifecycle.last_seen (the watermark field). Defaults to now. */
  lastSeen?: string;
  /** entity.lifecycle.first_seen. Defaults to lastSeen (or now). */
  firstSeen?: string;
  /**
   * Written to entity.source. Mirrors how extraction populates the field from
   * event.module / data_stream.dataset (e.g. 'entityanalytics_ad'). Maintainers
   * that filter by entity.source (like the administers maintainer) will skip
   * entities whose source does not match.
   */
  entitySource?: string;
}

export const seedHostEntity = async (
  esClient: EsClient,
  { entityId, hostName, relationship, lastSeen, firstSeen, entitySource }: SeedHostEntityOptions
) => {
  const last = lastSeen ?? new Date().toISOString();
  const first = firstSeen ?? last;
  const relationships =
    relationship && relationship.hostNames.length > 0
      ? { [relationship.key]: { raw_identifiers: { host: { name: relationship.hostNames } } } }
      : undefined;

  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(entityId),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      entity: {
        id: entityId,
        name: hostName,
        EngineMetadata: { Type: 'host' },
        ...(entitySource && { source: entitySource }),
        lifecycle: {
          first_seen: first,
          last_seen: last,
        },
        ...(relationships && { relationships }),
      },
      host: {
        name: hostName,
      },
      '@timestamp': last,
    },
  });
};

const relationshipIdsPath = (relationshipKey: string): string =>
  `entity.relationships.${relationshipKey}.ids`;

/**
 * Asserts that an entity's `<relationshipKey>.ids` contains the expected target
 * EUID. Callers use `triggerMaintainerRun(..., { sync: true })` so the task has
 * already settled — poll with a short window to absorb ES refresh lag.
 */
export const waitForRelationshipIds = async (
  esClient: EsClient,
  relationshipKey: string,
  entityId: string,
  expectedTargetId: string
): Promise<void> => {
  const idsPath = relationshipIdsPath(relationshipKey);
  await expect
    .poll(
      async () => {
        await esClient.indices.refresh({ index: LATEST_ALIAS });
        const response = await esClient.search({
          index: LATEST_ALIAS,
          query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
          size: 1,
        });
        const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
        return source
          ? normalizeKeywordList(getNestedValue(source, idsPath) ?? source[idsPath])
          : [];
      },
      { timeout: 5_000, intervals: [200] }
    )
    .toContain(expectedTargetId);
};

/**
 * Asserts that an entity's `<relationshipKey>.ids` does NOT contain the given
 * target. Callers use `triggerMaintainerRun(..., { sync: true })` so the task
 * has already settled — poll with a short window to absorb ES refresh lag.
 */
export const assertNoRelationshipId = async (
  esClient: EsClient,
  relationshipKey: string,
  entityId: string,
  unexpectedTargetId: string
): Promise<void> => {
  const idsPath = relationshipIdsPath(relationshipKey);
  await expect
    .poll(
      async () => {
        await esClient.indices.refresh({ index: LATEST_ALIAS });
        const response = await esClient.search({
          index: LATEST_ALIAS,
          query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
          size: 1,
        });
        const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
        return source
          ? normalizeKeywordList(getNestedValue(source, idsPath) ?? source[idsPath])
          : [];
      },
      { timeout: 5_000, intervals: [200] }
    )
    .not.toContain(unexpectedTargetId);
};

const RESOLVED_TO_PATH = 'entity.relationshpips.resolution.resolved_to';

export const waitForResolution = async (
  esClient: EsClient,
  entityId: string,
  expectedTarget: string,
  timeoutMs = 30_000
): Promise<Record<string, unknown>> => {
  const start = Date.now();
  let lastSource: Record<string, unknown> | undefined;

  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    const response = await esClient.search({
      index: LATEST_ALIAS,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });

    const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
    lastSource = source;
    if (source) {
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

export const assertNotResolved = async (
  esClient: EsClient,
  entityId: string,
  timeoutMs = 10_000
): Promise<void> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    await esClient.indices.refresh({ index: LATEST_ALIAS });
    const response = await esClient.search({
      index: LATEST_ALIAS,
      query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
      size: 1,
    });

    const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
    if (source) {
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
 *
 * Retries on 500 errors, which happen when the scheduler fires an automatic
 * run that overlaps with the manual trigger. Kibana wraps the actual
 * "currently running" error in a generic 500 body, so we retry on any 500.
 */
export const triggerMaintainerRun = async (
  apiClient: ForceLogExtractionApiClient,
  headers: Record<string, string>,
  maintainerId = 'automated-resolution',
  { maxRetries = 5, retryDelayMs = 2000, sync = false } = {}
) => {
  // Use `sync: true` in tests that need a settled watermark before proceeding.
  const runUrl = sync
    ? `${ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN(maintainerId)}?sync=true`
    : ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN(maintainerId);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await apiClient.post(runUrl, {
      headers,
      responseType: 'json',
      body: {},
    });

    if (response.statusCode === 200) {
      return response;
    }

    const body = JSON.stringify(response.body);

    if (response.statusCode !== 500 || attempt >= maxRetries) {
      throw new Error(`Failed to trigger maintainer run '${maintainerId}': ${body}`);
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
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
  apiClient.post(ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION(entityType), {
    headers,
    responseType: 'json',
    body: { fromDateISO, toDateISO },
  });

export const installAllEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
) =>
  apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
    headers,
    responseType: 'json',
    body: {},
  });

export const uninstallAllEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
) =>
  apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
    headers,
    responseType: 'json',
    body: {},
  });

export const getStatus = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
    headers,
    responseType: 'json',
  }) as Promise<ApiClientResponse>;

export const startEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  entityTypes: EntityType[]
) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.START, {
    headers,
    responseType: 'json',
    body: { entityTypes },
  });

export const stopEntityTypes = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  entityTypes: EntityType[]
) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.STOP, {
    headers,
    responseType: 'json',
    body: { entityTypes },
  });

export const startAllEntityTypes = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.START, {
    headers,
    responseType: 'json',
    body: {},
  });

export const stopAllEntityTypes = (apiClient: ApiClientFixture, headers: Record<string, string>) =>
  apiClient.put(ENTITY_STORE_ROUTES.public.STOP, {
    headers,
    responseType: 'json',
    body: {},
  });
