/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_COMPOSITE_SLO, mergeSloApiHeaders } from '../../fixtures';

apiTest.describe(
  'Get Composite SLO',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest(
      'returns the definition with a NO_DATA summary when member SLOs do not exist',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: DEFAULT_COMPOSITE_SLO,
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const created = createRes.body as Record<string, unknown>;

        const getRes = await apiClient.get(
          `api/observability/slo_composites/${created.id as string}`,
          { headers, responseType: 'json' }
        );
        expect(getRes).toHaveStatusCode(200);

        const { summary, members, ...definition } = getRes.body as Record<string, unknown>;
        const { members: _createdMembers, ...createdDefinition } = created;
        expect(definition).toMatchObject(createdDefinition);
        expect(members).toStrictEqual([]);
        expect(summary).toStrictEqual({
          sliValue: -1,
          status: 'NO_DATA',
          fiveMinuteBurnRate: 0,
          oneHourBurnRate: 0,
          oneDayBurnRate: 0,
          errorBudget: expect.objectContaining({ initial: 0, consumed: 0 }),
        });
      }
    );

    apiTest(
      'returns a NO_DATA summary for the maximum number of unresolved members with mixed instanceIds',
      async ({ apiClient }) => {
        const members = Array.from({ length: 25 }, (_, i) => ({
          sloId: `max-member-slo-${i % 5}`,
          weight: (i % 5) + 1,
          ...(i >= 5 ? { instanceId: `instance-${i}` } : {}),
        }));
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: { ...DEFAULT_COMPOSITE_SLO, name: 'Max Members Composite', members },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const { id } = createRes.body as { id: string };

        const getRes = await apiClient.get(`api/observability/slo_composites/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect(getRes.body).toMatchObject({
          members: [],
          summary: {
            sliValue: -1,
            status: 'NO_DATA',
            fiveMinuteBurnRate: 0,
            oneHourBurnRate: 0,
            oneDayBurnRate: 0,
            errorBudget: { initial: 0, consumed: 0 },
          },
        });

        const definitionRes = await apiClient.get(
          `api/observability/slo_composites/_definitions/${id}`,
          { headers, responseType: 'json' }
        );
        expect(definitionRes).toHaveStatusCode(200);
        expect((definitionRes.body as { members: unknown[] }).members).toStrictEqual(members);
      }
    );

    apiTest(
      'returns the definition without summary from the definitions endpoint',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: { ...DEFAULT_COMPOSITE_SLO, name: 'Definition Endpoint Composite' },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const created = createRes.body as Record<string, unknown>;

        const definitionRes = await apiClient.get(
          `api/observability/slo_composites/_definitions/${created.id as string}`,
          { headers, responseType: 'json' }
        );
        expect(definitionRes).toHaveStatusCode(200);
        expect(definitionRes.body).toStrictEqual(created);
      }
    );

    apiTest('returns 404 for a non-existent composite SLO', async ({ apiClient }) => {
      const getRes = await apiClient.get('api/observability/slo_composites/non-existent-id', {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(404);

      const definitionRes = await apiClient.get(
        'api/observability/slo_composites/_definitions/non-existent-id',
        { headers, responseType: 'json' }
      );
      expect(definitionRes).toHaveStatusCode(404);
    });
  }
);
