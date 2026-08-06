/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../fixtures/maintainers/constants';
import {
  clearEntityStoreIndices,
  seedUserEntity,
  seedEntraIdDeviceLog,
  triggerMaintainerRun,
  waitForRelationshipIds,
  waitForEntityStoreRunning,
  getRelationshipIds,
} from '../../fixtures/maintainers/helpers';

const MAINTAINER_ID = 'owns';
const RELATIONSHIP_KEY = 'owns';
const ENTRA_ID_NAMESPACE = 'entra_id';
const ENTRA_ID_LOG_INDEX = 'logs-entityanalytics_entra_id.entity-default';

apiTest.describe(
  'Entity Store owns maintainer (Entra ID device logs)',
  { tag: ENTITY_STORE_TAGS },
  () => {
    // Each test issues a synchronous maintainer run plus polling loops; the
    // default 60s Playwright timeout is too tight.
    apiTest.setTimeout(180_000);

    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      // `admin` is required: the install route enforces `securitySolution` +
      // `entity-analytics` Kibana privileges that lower roles do not hold.
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      // Covers all three index families; deleting only latest+updates would leak
      // stale history snapshots into the next run.
      await clearEntityStoreIndices(esClient);
      await esClient.deleteByQuery({
        index: ENTRA_ID_LOG_INDEX,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      // The `running` status flips before the latest alias is ready, so seeding
      // immediately after install races entity-store initialization.
      await waitForEntityStoreRunning(apiClient, defaultHeaders);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await esClient
        .deleteByQuery({
          index: ENTRA_ID_LOG_INDEX,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        })
        .catch(() => {});
      await clearEntityStoreIndices(esClient);
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest(
      'resolves a single-owner device into an owns edge on the owning user',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const ownerMail = `single.owner.${runId}@example.com`;
        const ownerId = `owner-id-${runId}`;
        const deviceId = `device-${runId}`;
        const entityId = `user:${ownerMail}@${ENTRA_ID_NAMESPACE}`;

        // The user entity must exist for the write to land — a missing actor
        // 404s and is counted in notFound.
        await seedUserEntity(esClient, {
          entityId,
          namespace: ENTRA_ID_NAMESPACE,
          email: ownerMail,
          entitySource: 'entityanalytics_entra_id',
        });

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `WORKSTATION-${runId}`,
          owners: [{ id: ownerId, mail: ownerMail }],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await waitForRelationshipIds(
          esClient,
          RELATIONSHIP_KEY,
          entityId,
          `host:${deviceId}`
        );
        expect(ids).toBeDefined();
      }
    );

    apiTest(
      'emits one edge per owner for a multi-owner shared device',
      async ({ apiClient, esClient }) => {
        // Regression test for the `registered_owners` flattening hazard: the
        // field is `type: group`, not `nested`, so ES flattens the array and
        // loses per-owner correlation. Both owners must still receive the edge.
        const runId = randomUUID().slice(0, 8);
        const aliceMail = `alice.${runId}@example.com`;
        const bobMail = `bob.${runId}@example.com`;
        const deviceId = `shared-device-${runId}`;
        const aliceEntityId = `user:${aliceMail}@${ENTRA_ID_NAMESPACE}`;
        const bobEntityId = `user:${bobMail}@${ENTRA_ID_NAMESPACE}`;

        for (const [entityId, email] of [
          [aliceEntityId, aliceMail],
          [bobEntityId, bobMail],
        ]) {
          await seedUserEntity(esClient, {
            entityId,
            namespace: ENTRA_ID_NAMESPACE,
            email,
            entitySource: 'entityanalytics_entra_id',
          });
        }

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `SHARED-WORKSTATION-${runId}`,
          owners: [
            { id: `alice-id-${runId}`, mail: aliceMail },
            { id: `bob-id-${runId}`, mail: bobMail },
          ],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, aliceEntityId, `host:${deviceId}`);
        await waitForRelationshipIds(esClient, RELATIONSHIP_KEY, bobEntityId, `host:${deviceId}`);
      }
    );

    apiTest(
      'writes no edge for a device with no registered owners',
      async ({ apiClient, esClient }) => {
        const runId = randomUUID().slice(0, 8);
        const ownerMail = `unowned.probe.${runId}@example.com`;
        const deviceId = `ownerless-device-${runId}`;
        const entityId = `user:${ownerMail}@${ENTRA_ID_NAMESPACE}`;

        await seedUserEntity(esClient, {
          entityId,
          namespace: ENTRA_ID_NAMESPACE,
          email: ownerMail,
          entitySource: 'entityanalytics_entra_id',
        });

        await seedEntraIdDeviceLog(esClient, {
          deviceId,
          deviceName: `ORPHAN-${runId}`,
          owners: [],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, MAINTAINER_ID, { sync: true });

        const ids = await getRelationshipIds(esClient, RELATIONSHIP_KEY, entityId);
        expect(ids).not.toContain(`host:${deviceId}`);
      }
    );
  }
);
