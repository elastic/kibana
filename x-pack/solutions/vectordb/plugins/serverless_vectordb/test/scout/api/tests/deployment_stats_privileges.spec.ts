/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, COMMON_HEADERS, DEPLOYMENT_STATS_API_PATH } from '../fixtures';

// namespaced per run so indices stranded by an interrupted run cannot break the next `beforeAll`
const suiteId = randomUUID();
const READABLE_INDEX = `vectordb-stats-readable-${suiteId}`;
const UNREADABLE_INDEX = `vectordb-stats-unreadable-${suiteId}`;
const UNREADABLE_DOCUMENTS = 5;

/**
 * Read access to one of the two indices below and no `monitor` anywhere, which is what the
 * built-in viewer role grants. Its stats are fully determined by the indices this suite creates,
 * whatever else the project happens to contain.
 */
const READ_ONE_INDEX_ROLE = {
  kibana: [{ base: ['read'], feature: {}, spaces: ['*'] }],
  elasticsearch: {
    cluster: [],
    indices: [{ names: [READABLE_INDEX], privileges: ['read', 'view_index_metadata'] }],
  },
};

apiTest.describe(
  'Vector DB deployment stats API privileges',
  { tag: [...tags.serverless.vectordb] },
  () => {
    apiTest.beforeAll(async ({ esClient, apiClient, samlAuth }) => {
      await esClient.indices.create({ index: READABLE_INDEX });
      await esClient.indices.create({ index: UNREADABLE_INDEX });

      await esClient.index({
        index: READABLE_INDEX,
        document: { text: 'readable' },
        refresh: true,
      });
      await esClient.bulk({
        refresh: true,
        operations: Array.from({ length: UNREADABLE_DOCUMENTS }).flatMap(() => [
          { create: { _index: UNREADABLE_INDEX } },
          { text: 'unreadable' },
        ]),
      });

      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

      // the index count comes from metering, which only picks an index up on a refresh after it is
      // created. Waiting here rather than inside a test keeps each test independently valid.
      await expect
        .poll(
          async () => {
            const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
              responseType: 'json',
            });

            return response.body.indicesCount;
          },
          { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
        )
        .toBeGreaterThanOrEqual(2);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: [READABLE_INDEX, UNREADABLE_INDEX] });
    });

    apiTest(
      'reports only the indices and documents the caller can read',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(READ_ONE_INDEX_ROLE);

        const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);

        // the vector count spans every index, so it is withheld from a caller without `monitor`
        expect(response.body).toMatchObject({
          indicesCount: 1,
          documentsCount: 1,
          vectorCount: null,
          newIndex: null,
        });
      }
    );

    // without this control an empty project would satisfy the expectations above
    apiTest(
      'reports both indices to a caller that can read them',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');

        const response = await apiClient.get(DEPLOYMENT_STATS_API_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.indicesCount).toBeGreaterThanOrEqual(2);
        expect(response.body.documentsCount).toBeGreaterThanOrEqual(UNREADABLE_DOCUMENTS + 1);

        const { newIndex } = response.body;

        expect(typeof newIndex?.indexName).toBe('string');
        expect(typeof newIndex?.createdAt).toBe('number');
        expect(newIndex?.documentsCount).toBeGreaterThanOrEqual(0);
        expect(newIndex?.sizeInBytes).toBeGreaterThanOrEqual(0);
      }
    );
  }
);
