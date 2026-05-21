/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';
import { get } from 'lodash';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  LATEST_ALIAS,
} from '../../../scout/api/fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices, triggerMaintainerRun } from '../../../scout/api/fixtures/helpers';
import { hashEuid } from '../../../../common/domain/euid';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ID of the accesses maintainer as registered in accesses/index.ts
const ACCESSES_MAINTAINER_ID = 'accesses_frequently_and_infrequently';

// system.auth integration index pattern (namespace = default)
const LOG_INDEX = 'logs-system.auth-default';

// Access-count threshold from accesses/configs.ts — 5 events → accesses_frequently
const EVENT_COUNT = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Seeds an SSH login event into the given ES client.
 * Uses data_stream.dataset = "system.auth" so that the EUID field evaluation
 * computes entity.namespace = "local" (user.name + host.id present, non-IDP source).
 * Resulting user EUID: user:${userName}@${hostId}@local
 * Resulting host EUID: host:${hostId}
 */
async function ingestSshLogin(
  esClient: EsClient,
  { userName, hostId, hostName }: { userName: string; hostId: string; hostName: string }
) {
  await esClient.index({
    index: LOG_INDEX,
    refresh: 'wait_for',
    body: {
      '@timestamp': new Date(Date.now() - 5 * 60_000).toISOString(),
      'event.category': 'authentication',
      'event.action': 'ssh_login',
      'event.outcome': 'success',
      'user.name': userName,
      'host.id': hostId,
      'host.name': hostName,
      'data_stream.dataset': 'system.auth',
    },
  });
}

/**
 * Seeds a user entity stub into the origin latest index so that bulkUpdateEntity
 * has a document to update when the maintainer writes relationship fields.
 * User EUID for local users: user:${userName}@${hostId}@local
 */
async function seedLocalUserEntity(
  esClient: EsClient,
  { userName, hostId }: { userName: string; hostId: string }
) {
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
async function waitForEntityStoreRunning(
  apiClient: {
    get: (
      url: string,
      opts: { headers: Record<string, string>; responseType: 'json' }
    ) => Promise<{ statusCode: number; body: unknown }>;
  },
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
          continue;
        }
        for (const component of components) {
          if (component.installed !== true) {
            missing.push(`${engine.type}/${component.id}`);
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
 * Polls the LATEST index until the given entity has a non-empty
 * `entity.relationships.accesses_frequently.ids` array, or throws on timeout.
 *
 * `indices.refresh` and `search` can hit transient shard-level errors on a
 * freshly-installed v2 latest index (e.g. `already_closed_exception` while a
 * replica shard is still settling), so we swallow per-iteration errors and
 * keep polling rather than failing the test on a recoverable hiccup.
 */
async function waitForAccessesFrequently(
  esClient: EsClient,
  entityId: string,
  timeoutMs = 60_000
): Promise<Record<string, unknown>> {
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
        const ids = get(src, 'entity.relationships.accesses_frequently.ids');
        if (Array.isArray(ids) && ids.length > 0) {
          return src;
        }
      }
    } catch (e) {
      lastError = e;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const lastErrorMsg = lastError instanceof Error ? lastError.message : String(lastError ?? '');
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for accesses_frequently relationship on entity '${entityId}'` +
      (lastErrorMsg ? ` (last error: ${lastErrorMsg})` : '')
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

apiTest.describe(
  'CPS relationship maintainer — accesses from linked serverless project',
  { tag: tags.serverless.security.complete },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // INSTALL returns before the engine finishes provisioning the latest alias —
      // poll until every component is installed so seed/refresh have an alias to use.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);

      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.afterAll(async ({ apiClient, esClient, linkedProject }) => {
      await linkedProject.esClient
        .deleteByQuery({
          index: LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
        })
        .catch(() => {});
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'relationship written to origin entity when SSH login events are ingested on linked project',
      async ({ apiClient, esClient, linkedProject }) => {
        const runId = randomUUID().slice(0, 8);
        const userName = `cps_ssh_user_${runId}`;
        const hostId = `cps-host-${runId}`;
        const hostName = `cps-workstation-${runId}`;

        // Seed the user entity in the origin store so bulkUpdateEntity has a doc to update.
        const entityId = await seedLocalUserEntity(esClient, { userName, hostId });

        // Ingest enough events on the linked project to cross the accesses_frequently threshold (>4).
        for (let i = 0; i < EVENT_COUNT; i++) {
          await ingestSshLogin(linkedProject.esClient, { userName, hostId, hostName });
        }

        // Maintainers were inited in beforeAll; just trigger the accesses run here.
        await triggerMaintainerRun(apiClient, internalHeaders, ACCESSES_MAINTAINER_ID);

        // Wait for the relationship to land in the origin entity store.
        const entityDoc = await waitForAccessesFrequently(esClient, entityId);

        const relIds = get(entityDoc, 'entity.relationships.accesses_frequently.ids') as string[];
        expect(relIds).toContain(`host:${hostId}`);
      }
    );
  }
);
