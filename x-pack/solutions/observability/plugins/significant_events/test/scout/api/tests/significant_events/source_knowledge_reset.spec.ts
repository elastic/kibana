/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { v4 as uuidv4 } from 'uuid';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const SOURCES_PATH = 'internal/nightshift/sources';

apiTest.describe(
  'Source knowledge reset API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let sourceId: string;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      // Creating a source puts its ES|QL view, which needs index privileges on the view name.
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { ...COMMON_API_HEADERS, ...cookieHeader };

      const response = await apiClient.post(SOURCES_PATH, {
        headers,
        // A wildcard over no indices is accepted, so the spec needs no data.
        body: { title: `Reset spec ${uuidv4().slice(0, 8)}`, esql: 'FROM logs-scout-reset-*' },
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      sourceId = response.body.source.id;
    });

    apiTest.afterAll(async ({ apiClient }) => {
      // Unset when beforeAll failed; a DELETE on `sources/undefined` would only add noise.
      if (sourceId) {
        await apiClient.delete(`${SOURCES_PATH}/${sourceId}`, { headers, responseType: 'json' });
      }
    });

    apiTest(
      'deletes the knowledge indicators of a source and keeps the source',
      async ({ apiClient }) => {
        const upsert = await apiClient.post(`internal/streams/${sourceId}/features`, {
          headers,
          body: {
            id: 'scout-reset-feature',
            type: 'entity',
            description: 'A feature the reset removes',
            properties: {},
            confidence: 80,
          },
          responseType: 'json',
        });
        expect(upsert.statusCode).toBe(200);

        const before = await apiClient.get(`internal/streams/${sourceId}/features`, {
          headers,
          responseType: 'json',
        });
        expect(before.body.features).toHaveLength(1);

        const reset = await apiClient.post(
          `internal/streams/${sourceId}/knowledge_indicators/_reset`,
          { headers, responseType: 'json' }
        );
        expect(reset.statusCode).toBe(200);
        expect(reset.body).toStrictEqual({ acknowledged: true });

        const after = await apiClient.get(`internal/streams/${sourceId}/features`, {
          headers,
          responseType: 'json',
        });
        expect(after.body.features).toStrictEqual([]);

        const source = await apiClient.get(`${SOURCES_PATH}/${sourceId}`, {
          headers,
          responseType: 'json',
        });
        expect(source.statusCode).toBe(200);
      }
    );

    apiTest('returns 404 for a source that does not exist', async ({ apiClient }) => {
      const response = await apiClient.post(
        `internal/streams/${uuidv4()}/knowledge_indicators/_reset`,
        { headers, responseType: 'json' }
      );

      expect(response.statusCode).toBe(404);
    });
  }
);
