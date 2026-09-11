/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

import {
  ENTITY_STORE_ROUTES,
  HISTORY_INDEX_PATTERN,
  LATEST_ALIAS,
  LATEST_INDEX,
  UPDATES_INDEX,
} from './constants';

/**
 * Polls until the entity store status is `running` AND every engine component
 * shows `installed: true`. The plain `running` status flips before backing
 * indices are ready, causing races in tests that seed immediately after install.
 */
export const waitForEntityStoreRunning = async (
  apiClient: MaintainerApiClient,
  headers: Record<string, string>,
  timeoutMs = 60_000
): Promise<void> => {
  const start = Date.now();
  let lastStatus: string | undefined;
  let lastMissing: string[] = [];

  while (Date.now() - start < timeoutMs) {
    const response = await apiClient.get(
      `${ENTITY_STORE_ROUTES.public.STATUS}?include_components=true`,
      { headers, responseType: 'json' }
    );
    const body = response.body as
      | {
          status?: string;
          engines?: Array<{
            type?: string;
            status?: string;
            components?: Array<{ id?: string; installed?: boolean }>;
          }>;
        }
      | undefined;
    lastStatus = body?.status;

    if (lastStatus === 'running') {
      const engines = body?.engines ?? [];
      const missing: string[] = [];
      let allEnginesHaveComponents = engines.length > 0;
      for (const engine of engines) {
        const components = engine.components ?? [];
        if (components.length === 0) {
          allEnginesHaveComponents = false;
          missing.push(`${engine.type}/<no-components-yet>`);
        } else {
          for (const component of components) {
            if (component.installed !== true) {
              missing.push(`${engine.type}/${component.id}`);
            }
          }
        }
      }
      lastMissing = missing;
      if (allEnginesHaveComponents && missing.length === 0) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for entity store status=running with all components installed ` +
      `(last status: ${lastStatus}, missing components: ${lastMissing.join(', ') || '<none>'})`
  );
};

/** Deletes all entity store indices (latest, updates, history) to prevent cross-run leakage. */
export const clearEntityStoreIndices = async (esClient: EsClient) => {
  const resolved = await esClient.indices.resolveIndex({ name: HISTORY_INDEX_PATTERN });
  const historyIndices = resolved.indices.map((i) => i.name);

  const toDelete = [LATEST_INDEX, UPDATES_INDEX, ...historyIndices];
  await esClient.indices.delete({ index: toDelete, ignore_unavailable: true }, { ignore: [404] });
};

/** Minimal API client shape for maintainer helpers. Avoids importing Scout's full ApiClient type. */
export interface MaintainerApiClient {
  get(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
    }
  ): Promise<{ statusCode: number; body: unknown }>;
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: unknown }>;
}

interface SeedUserEntityOptions {
  entityId: string;
  namespace: string;
  email: string | string[];
  lastSeen?: string;
  firstSeen?: string;
  /** Back-compat alias when lastSeen/firstSeen are not provided. */
  timestamp?: string;
  entitySource?: string;
  /** Raw identifier bag seeded under `entity.relationships.<key>.raw_identifiers`. */
  relationship?: {
    key: string;
    userEmails?: string[];
    userIds?: string[];
    userNames?: string[];
    hostNames?: string[];
  };
}

export const seedUserEntity = async (
  esClient: EsClient,
  {
    entityId,
    namespace,
    email,
    lastSeen,
    firstSeen,
    timestamp,
    entitySource,
    relationship,
  }: SeedUserEntityOptions
) => {
  const last = lastSeen ?? timestamp ?? new Date().toISOString();
  const first = firstSeen ?? last;

  const userBag: Record<string, string[]> = {};
  if (relationship?.userEmails?.length) {
    userBag.email = relationship.userEmails;
  }
  if (relationship?.userIds?.length) {
    userBag.id = relationship.userIds;
  }
  if (relationship?.userNames?.length) {
    userBag.name = relationship.userNames;
  }
  const rawIdentifiers: Record<string, unknown> = {};
  if (Object.keys(userBag).length > 0) {
    rawIdentifiers.user = userBag;
  }
  if (relationship?.hostNames?.length) {
    rawIdentifiers.host = { name: relationship.hostNames };
  }
  const relationships =
    relationship && Object.keys(rawIdentifiers).length > 0
      ? { [relationship.key]: { raw_identifiers: rawIdentifiers } }
      : undefined;

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
        ...(entitySource && { source: entitySource }),
        lifecycle: {
          first_seen: first,
          last_seen: last,
        },
        ...(relationships && { relationships }),
      },
      user: {
        email,
        name: entityId,
      },
      '@timestamp': last,
    },
  });
};

interface SeedHostEntityOptions {
  entityId: string;
  hostName: string;
  /** Host names seeded under raw_identifiers.host.name. */
  relationship?: {
    key: string;
    hostNames: string[];
  };
  lastSeen?: string;
  firstSeen?: string;
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

const normalizeKeywordList = (value: unknown): string[] => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value.map((v) => String(v)) : [String(value)];
};

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

/**
 * Polls until `entity.relationships.<key>.ids` contains the expected target EUID,
 * or throws on timeout. Absorbs ES refresh lag and transient replica errors.
 */
export const waitForRelationshipIds = async (
  esClient: EsClient,
  relationshipKey: string,
  entityId: string,
  expectedTargetId: string,
  timeoutMs = 60_000
): Promise<Record<string, unknown>> => {
  const idsPath = relationshipIdsPath(relationshipKey);
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      await esClient.indices.refresh({ index: LATEST_ALIAS });
      const response = await esClient.search({
        index: LATEST_ALIAS,
        query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
        size: 1,
      });
      const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
      if (source) {
        const ids = normalizeKeywordList(getNestedValue(source, idsPath) ?? source[idsPath]);
        if (ids.includes(expectedTargetId)) {
          return source;
        }
      }
    } catch (e) {
      lastError = e;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const lastErrorMsg = lastError instanceof Error ? lastError.message : String(lastError ?? '');
  const errorSuffix = lastErrorMsg ? ` (last error: ${lastErrorMsg})` : '';
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for '${idsPath}' on entity '${entityId}' to contain '${expectedTargetId}'${errorSuffix}`
  );
};

/** Returns the current `entity.relationships.<key>.ids` array for an entity (empty if absent). */
export const getRelationshipIds = async (
  esClient: EsClient,
  relationshipKey: string,
  entityId: string
): Promise<string[]> => {
  await esClient.indices.refresh({ index: LATEST_ALIAS });
  const response = await esClient.search({
    index: LATEST_ALIAS,
    query: { bool: { filter: [{ term: { 'entity.id': entityId } }] } },
    size: 1,
  });
  const source = response.hits.hits[0]?._source as Record<string, unknown> | undefined;
  if (!source) return [];
  const idsPath = relationshipIdsPath(relationshipKey);
  return normalizeKeywordList(getNestedValue(source, idsPath) ?? source[idsPath]);
};

/** Asserts that `entity.relationships.<key>.ids` does NOT contain the given target EUID. */
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
      { timeout: 10_000, intervals: [200] }
    )
    .not.toContain(unexpectedTargetId);
};

/**
 * Triggers a maintainer run. Retries on 500s (scheduler overlap produces a
 * generic 500; pass `sync: true` to block until the run completes).
 */
export const triggerMaintainerRun = async (
  apiClient: MaintainerApiClient,
  headers: Record<string, string>,
  maintainerId = 'automated-resolution',
  { maxRetries = 5, retryDelayMs = 1000, sync = false } = {}
) => {
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

interface SeedLogDocumentOptions {
  /** `logs-*` data-stream target; `op_type: 'create'` is required. */
  index: string;
  /** Written to `host.id` — becomes the `host:<id>` target EUID. */
  hostId: string;
  hostName: string;
  /**
   * Integration-specific fields merged into the document root. For plain-object
   * mapped fields (e.g. `device.registered_owners`), pass flattened parallel
   * arrays to match how Elasticsearch stores them at ingest time.
   */
  integrationFields: Record<string, unknown>;
  /** Defaults to 5 minutes ago (within the 30d lookback window). */
  timestamp?: string;
}

/** Seeds one log document with standard ECS host fields plus integration-specific fields. */
export const seedLogDocument = async (
  esClient: EsClient,
  { index, hostId, hostName, integrationFields, timestamp }: SeedLogDocumentOptions
): Promise<void> => {
  const ts = timestamp ?? new Date(Date.now() - 5 * 60_000).toISOString();

  await esClient.index({
    index,
    op_type: 'create',
    refresh: 'wait_for',
    document: {
      '@timestamp': ts,
      event: { kind: 'asset', category: ['host'] },
      host: { id: hostId, name: hostName },
      ...integrationFields,
    },
  });
};
