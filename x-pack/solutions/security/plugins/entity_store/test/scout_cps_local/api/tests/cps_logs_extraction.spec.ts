/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { EsClient } from '@kbn/scout-security';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];
import { get } from 'lodash';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  LATEST_ALIAS,
  UPDATES_INDEX,
} from '../../../scout/api/fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../../../scout/api/fixtures/helpers';

const CPS_TEST_LOGS_INDEX = 'logs-cps-test';
const NOW = Date.now();
const WINDOW_FROM = new Date(NOW - 10 * 60_000).toISOString();
const WINDOW_TO = new Date(NOW + 60 * 60_000).toISOString();

async function ingestLogOnLinked(
  linkedEsClient: EsClient,
  doc: Record<string, unknown> & { '@timestamp': string }
) {
  await linkedEsClient.index({
    index: CPS_TEST_LOGS_INDEX,
    refresh: 'wait_for',
    body: doc,
  });
}

async function forceLogExtraction(
  apiClient: ApiWorkerFixtures['apiClient'],
  internalHeaders: Record<string, string>,
  entityType: string
) {
  const res = await apiClient.post(ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION(entityType), {
    headers: internalHeaders,
    responseType: 'json',
    body: { fromDateISO: WINDOW_FROM, toDateISO: WINDOW_TO },
  });
  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
}

apiTest.describe(
  'Entity Store CPS logs extraction (linked serverless project)',
  { tag: tags.serverless.security.complete },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiClient, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient, linkedProject }) => {
      await linkedProject.esClient.indices.delete(
        { index: CPS_TEST_LOGS_INDEX },
        { ignore: [404] }
      );
      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      await clearEntityStoreIndices(esClient);
    });

    apiTest(
      'writes a user entity into updates from a linked log',
      async ({ apiClient, esClient, linkedProject }) => {
        const userName = `cps_user_${Date.now()}`;
        await ingestLogOnLinked(linkedProject.esClient, {
          '@timestamp': new Date(NOW - 5 * 60_000).toISOString(),
          user: { name: userName, id: `${userName}-id` },
          host: { id: 'h-1' },
          event: { outcome: 'success' },
        });

        await forceLogExtraction(apiClient, internalHeaders, 'user');
        await esClient.indices.refresh({ index: UPDATES_INDEX });

        const hits = await esClient.search({
          index: UPDATES_INDEX,
          query: { term: { 'user.name': userName } },
        });
        expect(hits.hits.hits.length).toBeGreaterThanOrEqual(1);
        expect(get(hits.hits.hits[0]._source, ['user', 'entity', 'name'])).toBe(userName);
      }
    );

    apiTest(
      'promotes a linked-log entity into latest after a follow-up main run',
      async ({ apiClient, esClient, linkedProject }) => {
        const userName = `cps_latest_${Date.now()}`;
        const hostId = 'h-latest';
        await ingestLogOnLinked(linkedProject.esClient, {
          '@timestamp': new Date(NOW - 5 * 60_000).toISOString(),
          user: { name: userName, id: `${userName}-id` },
          host: { id: hostId },
          event: { outcome: 'success' },
        });

        // First call: CPS path writes the entity-update doc into updates.
        await forceLogExtraction(apiClient, internalHeaders, 'user');
        // Second call: main path scans updates and merges into latest.
        await forceLogExtraction(apiClient, internalHeaders, 'user');

        await esClient.indices.refresh({ index: LATEST_ALIAS });

        const expectedEntityId = `user:${userName}@${hostId}@local`;
        const hits = await esClient.search({
          index: LATEST_ALIAS,
          query: { term: { 'entity.id': expectedEntityId } },
        });
        expect(hits.hits.hits).toHaveLength(1);
        expect(get(hits.hits.hits[0]._source, ['entity', 'name'])).toBe(userName);
      }
    );
  }
);
