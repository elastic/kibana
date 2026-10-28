/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
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
 *
 * Defaults to 150s: provisioning four engines' backing indices routinely exceeds
 * 60s on a loaded CI agent, and callers run this inside a `beforeAll` configured
 * for 180s — the poll must give up before the hook does, so the failure names the
 * missing components instead of surfacing as an opaque hook timeout.
 */
export const waitForEntityStoreRunning = async (
  apiClient: MaintainerApiClient,
  headers: Record<string, string>,
  timeoutMs = 150_000
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

interface SeedHostEntityOptions {
  entityId: string;
  hostName: string;
  lastSeen?: string;
  firstSeen?: string;
  entitySource?: string;
}

export const seedHostEntity = async (
  esClient: EsClient,
  { entityId, hostName, lastSeen, firstSeen, entitySource }: SeedHostEntityOptions
) => {
  const last = lastSeen ?? new Date().toISOString();
  const first = firstSeen ?? last;

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
      },
      host: {
        name: hostName,
      },
      '@timestamp': last,
    },
  });
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
