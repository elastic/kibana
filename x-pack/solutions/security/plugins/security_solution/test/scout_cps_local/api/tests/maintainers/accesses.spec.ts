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
import { ENTITY_STORE_ROUTES, FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  waitForEntityStoreRunning,
  triggerMaintainerRun,
  waitForRelationshipIds,
  seedLocalUserEntity,
} from '../../fixtures';

// ID of the accesses maintainer as registered in maintainers/accesses/index.ts.
const ACCESSES_MAINTAINER_ID = 'accesses_frequently_and_infrequently';
// system.auth integration index pattern (namespace = default).
const LOG_INDEX = 'logs-system.auth-default';
// Access-count threshold from accesses/configs.ts — 5 events → accesses_frequently.
const EVENT_COUNT = 5;

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

      // INSTALL returns before engines finish provisioning the latest alias —
      // poll until every component is installed so seed/refresh have an alias.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);

      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        { headers: internalHeaders, responseType: 'json', body: {} }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.afterAll(async ({ apiClient, linkedProject }) => {
      await linkedProject.esClient
        .deleteByQuery({ index: LOG_INDEX, query: { match_all: {} }, refresh: true })
        .catch(() => {});
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      'writes accesses_frequently relationship to origin entity when 5 SSH events ingested on linked project',
      async ({ apiClient, esClient, linkedProject }) => {
        const runId = randomUUID().slice(0, 8);
        const userName = `cps_ssh_user_${runId}`;
        const hostId = `cps-host-${runId}`;
        const hostName = `cps-workstation-${runId}`;

        const entityId = await seedLocalUserEntity(esClient, { userName, hostId });

        for (let i = 0; i < EVENT_COUNT; i++) {
          await ingestSshLogin(linkedProject.esClient, { userName, hostId, hostName });
        }

        await triggerMaintainerRun(apiClient, internalHeaders, ACCESSES_MAINTAINER_ID);

        const ids = await waitForRelationshipIds(esClient, entityId, 'accesses_frequently');
        expect(ids).toContain(`host:${hostId}`);
      }
    );
  }
);
