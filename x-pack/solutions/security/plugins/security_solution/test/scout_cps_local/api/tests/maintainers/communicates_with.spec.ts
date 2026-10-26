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

// ID of the communicates_with maintainer as registered in maintainers/communicates_with/index.ts.
const COMMUNICATES_WITH_MAINTAINER_ID = 'communicates_with';
// AWS CloudTrail integration index pattern (namespace = default).
const LOG_INDEX = 'logs-aws.cloudtrail-default';

/**
 * Seeds an AWS CloudTrail event with a human IAM identity and a target host
 * EUID. The `communicates_with` aws_cloudtrail integration extracts the actor
 * via standard ECS user fields and the target via `host.target.entity.id`.
 */
async function ingestCloudTrailEvent(
  esClient: EsClient,
  { userName, hostId, targetHostId }: { userName: string; hostId: string; targetHostId: string }
) {
  await esClient.index({
    index: LOG_INDEX,
    refresh: 'wait_for',
    body: {
      '@timestamp': new Date(Date.now() - 5 * 60_000).toISOString(),
      'event.category': 'iam',
      'event.action': 'CreateInstance',
      'event.outcome': 'success',
      'user.name': userName,
      'host.id': hostId,
      'aws.cloudtrail.user_identity.type': 'IAMUser',
      'host.target.entity.id': targetHostId,
      'data_stream.dataset': 'aws.cloudtrail',
    },
  });
}

apiTest.describe(
  'CPS relationship maintainer — communicates_with from linked serverless project',
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
      'writes communicates_with relationship to origin entity when a CloudTrail event is ingested on linked project',
      async ({ apiClient, esClient, linkedProject }) => {
        const runId = randomUUID().slice(0, 8);
        const userName = `cps_iam_user_${runId}`;
        const hostId = `cps-actor-host-${runId}`;
        const targetHostId = `cps-target-host-${runId}`;

        const entityId = await seedLocalUserEntity(esClient, { userName, hostId });

        // communicates_with has no event-count threshold; a single matching
        // event is sufficient to surface the relationship.
        await ingestCloudTrailEvent(linkedProject.esClient, { userName, hostId, targetHostId });

        await triggerMaintainerRun(apiClient, internalHeaders, COMMUNICATES_WITH_MAINTAINER_ID);

        const ids = await waitForRelationshipIds(esClient, entityId, 'communicates_with');
        expect(ids).toContain(`host:${targetHostId}`);
      }
    );
  }
);
