/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  DEFAULT_SLO,
  mergeSloApiHeaders,
  pollUntilTrue,
  sloApiPathWithQuery,
} from '../fixtures';

apiTest.describe(
  'Find SLOs by outdated status and tags',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('finds SLOs by different tags', async ({ apiClient }) => {
      const tagsList = ['test1', 'test2'];
      const slo1 = {
        ...DEFAULT_SLO,
        tags: [tagsList[0]],
        name: 'Test SLO for api integration 1',
      };
      const slo2 = {
        ...DEFAULT_SLO,
        tags: [tagsList[1]],
        name: 'Test SLO for api integration 2',
      };

      await Promise.allSettled([
        apiClient.post('api/observability/slos', { headers, body: slo1, responseType: 'json' }),
        apiClient.post('api/observability/slos', { headers, body: slo2, responseType: 'json' }),
      ]);

      const definitions = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos/_definitions', { tags: tagsList.join(',') }),
        { headers, responseType: 'json' }
      );
      expect(definitions).toHaveStatusCode(200);
      expect((definitions.body as { total: number }).total).toBe(2);

      const definitionsWithoutTag2 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos/_definitions', { tags: tagsList[0] }),
        { headers, responseType: 'json' }
      );
      expect(definitionsWithoutTag2).toHaveStatusCode(200);
      const d2 = definitionsWithoutTag2.body as {
        total: number;
        results: Array<{ tags: string[] }>;
      };
      expect(d2.total).toBe(1);
      expect(d2.results.find((def) => def.tags.includes('test2'))).toBeUndefined();
    });

    apiTest('finds outdated SLOs', async ({ apiClient }) => {
      const outdatedSLO = { ...DEFAULT_SLO, name: 'outdated slo' };
      const recentSLO = { ...DEFAULT_SLO, name: 'recent slo' };
      const outdatedResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: outdatedSLO,
        responseType: 'json',
      });
      expect(outdatedResponse).toHaveStatusCode(200);
      const recentResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: recentSLO,
        responseType: 'json',
      });
      expect(recentResponse).toHaveStatusCode(200);
      const outdatedSloId = outdatedResponse.body.id as string;

      const soRes = await apiClient.get(
        `api/saved_objects/_find?type=slo&filter=slo.attributes.id:(${outdatedSloId})`,
        { headers, responseType: 'json' }
      );
      expect(soRes).toHaveStatusCode(200);
      const savedObject = (
        soRes.body as { saved_objects: Array<{ attributes: unknown; id: string }> }
      ).saved_objects[0];

      const updateSo = await apiClient.put(`api/saved_objects/slo/${savedObject.id}`, {
        headers,
        body: {
          attributes: { ...(savedObject.attributes as Record<string, unknown>), version: 1 },
        },
        responseType: 'json',
      });
      expect(updateSo).toHaveStatusCode(200);

      const allDefinitions = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos/_definitions', {
          includeOutdatedOnly: 'false',
        }),
        { headers, responseType: 'json' }
      );
      expect(allDefinitions).toHaveStatusCode(200);
      const all = allDefinitions.body as { results: Array<{ id: string }> };
      expect(all.results.find((slo) => slo.id === recentResponse.body.id)?.id).toBe(
        recentResponse.body.id as string
      );

      const definitions = await apiClient.get(
        sloApiPathWithQuery('api/observability/slos/_definitions', { includeOutdatedOnly: 'true' }),
        { headers, responseType: 'json' }
      );
      expect(definitions).toHaveStatusCode(200);
      const defBody = definitions.body as { results: Array<{ id: string }> };
      expect(defBody.results.find((slo) => slo.id === recentResponse.body.id)).toBeUndefined();
      expect(defBody.results.find((slo) => slo.id === outdatedResponse.body.id)?.id).toBe(
        outdatedSloId
      );
    });

    apiTest('finds SLOs with health data when includeHealth is true', async ({ apiClient }) => {
      const sloBody = { ...DEFAULT_SLO, name: 'Test SLO with health' };
      const createResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: sloBody,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      const sloId = createResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          const definitions = await apiClient.get(
            sloApiPathWithQuery('api/observability/slos/_definitions', { includeHealth: 'true' }),
            { headers, responseType: 'json' }
          );
          if (definitions.statusCode !== 200) {
            return false;
          }
          const body = definitions.body as {
            total: number;
            results: Array<{
              id: string;
              health?: {
                isProblematic: boolean;
                rollup: { isProblematic: boolean; missing: boolean; status: string; state: string };
                summary: {
                  isProblematic: boolean;
                  missing: boolean;
                  status: string;
                  state: string;
                };
              };
            }>;
          };
          if (body.total <= 0) {
            return false;
          }
          const createdSlo = body.results.find((def) => def.id === sloId);
          if (!createdSlo?.health) {
            return false;
          }
          const h = createdSlo.health;
          if (h.isProblematic !== false) {
            return false;
          }
          if (
            h.rollup.isProblematic !== false ||
            h.rollup.missing !== false ||
            h.rollup.status !== 'healthy' ||
            !['started', 'indexing'].includes(h.rollup.state)
          ) {
            return false;
          }
          if (
            h.summary.isProblematic !== false ||
            h.summary.missing !== false ||
            h.summary.status !== 'healthy' ||
            !['started', 'indexing'].includes(h.summary.state)
          ) {
            return false;
          }
          return true;
        },
        { timeoutMs: 180_000, intervalMs: 3000, label: 'SLO health in definitions' }
      );
    });
  }
);
