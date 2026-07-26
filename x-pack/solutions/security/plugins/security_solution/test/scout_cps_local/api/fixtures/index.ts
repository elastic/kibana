/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { EsClient } from '@kbn/scout-security';
import { ENTITY_LATEST, ENTITY_STORE_ROUTES, getEntitiesAlias } from '@kbn/entity-store/common';
import { hashEuid } from '@kbn/entity-store/common/domain/euid';

const BASE_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const PUBLIC_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': '2023-10-31',
};

export const INTERNAL_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': '2',
};

export const LATEST_ALIAS = getEntitiesAlias(ENTITY_LATEST, 'default');

interface JsonApiClient {
  get: (
    url: string,
    opts: { headers: Record<string, string>; responseType: 'json' }
  ) => Promise<{ statusCode: number; body: unknown }>;
  post: (
    url: string,
    opts: { headers: Record<string, string>; responseType: 'json'; body: object }
  ) => Promise<{ statusCode: number; body: unknown }>;
}

/**
 * Polls GET /api/security/entity_store/status?include_components=true until the
 * top-level status is `running` AND every engine's component list shows all
 * resources `installed: true`, or throws on timeout.
 *
 * The plain `running` status flips to true once each engine's task is scheduled,
 * which is BEFORE the engine actually finishes provisioning its backing indices,
 * aliases, templates, and pipelines. Tests that immediately read/write
 * `entities-latest-default` race that setup and intermittently fail with
 * `index_not_found_exception`, so we wait for component-level readiness instead.
 */
export async function waitForEntityStoreRunning(
  apiClient: JsonApiClient,
  headers: Record<string, string>,
  timeoutMs = 60_000
): Promise<void> {
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
}

/**
 * Triggers an immediate maintainer run via the internal `_run/{id}` endpoint.
 * The route calls `taskManager.runSoon()` and does NOT wait for completion.
 *
 * Retries on 500 errors, which Kibana returns when the maintainer's scheduled
 * run overlaps with the manual trigger (the actual `currently running` cause is
 * wrapped in a generic 500 body).
 */
export async function triggerMaintainerRun(
  apiClient: JsonApiClient,
  headers: Record<string, string>,
  maintainerId: string,
  { maxRetries = 5, retryDelayMs = 2000 } = {}
): Promise<void> {
  const runPath = ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_RUN.replace('{id}', maintainerId);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await apiClient.post(runPath, {
      headers,
      responseType: 'json',
      body: {},
    });

    if (response.statusCode === 200) {
      return;
    }

    if (response.statusCode === 500 && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    } else {
      throw new Error(
        `Failed to trigger maintainer ${maintainerId}: ${response.statusCode} ${JSON.stringify(
          response.body
        )}`
      );
    }
  }
}

/**
 * Polls the LATEST alias for the given entity until at least one ID appears
 * under `entity.relationships.<relationshipKey>.ids`, then returns those IDs.
 * Tolerates per-iteration shard-level transient errors (e.g.
 * `already_closed_exception` during fresh-engine replica settling).
 */
export async function waitForRelationshipIds(
  esClient: EsClient,
  entityId: string,
  relationshipKey: string,
  timeoutMs = 60_000
): Promise<string[]> {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeoutMs) {
    try {
      await esClient.indices.refresh({ index: LATEST_ALIAS });
      const res = await esClient.search({
        index: LATEST_ALIAS,
        query: { term: { 'entity.id': entityId } },
        size: 1,
      });

      const src = res.hits.hits[0]?._source as Record<string, unknown> | undefined;
      if (src) {
        const ids = get(src, `entity.relationships.${relationshipKey}.ids`);
        if (Array.isArray(ids) && ids.length > 0) {
          return ids as string[];
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
    `Timed out after ${timeoutMs}ms waiting for relationship '${relationshipKey}' on entity '${entityId}'${errorSuffix}`
  );
}

/**
 * Seeds a local-namespace user entity stub into the origin latest index so
 * that `bulkUpdateEntity` has a document to update when the maintainer writes
 * relationship fields. Local-user EUID format: `user:${userName}@${hostId}@local`.
 */
export async function seedLocalUserEntity(
  esClient: EsClient,
  { userName, hostId }: { userName: string; hostId: string }
): Promise<string> {
  const entityId = `user:${userName}@${hostId}@local`;
  const now = new Date().toISOString();
  await esClient.index({
    index: LATEST_ALIAS,
    id: hashEuid(entityId),
    refresh: 'wait_for',
    pipeline: '_none',
    body: {
      '@timestamp': now,
      entity: {
        id: entityId,
        name: userName,
        EngineMetadata: { Type: 'user' },
        namespace: 'local',
        lifecycle: { first_seen: now, last_seen: now },
      },
      'user.name': userName,
      'host.id': hostId,
    },
  });
  return entityId;
}
