/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepairActionsGroupResult } from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import {
  apiTest,
  createSloTransformAssertions,
  DEFAULT_SLO,
  mergeSloApiHeaders,
  type SloTransformAssertions,
} from '../fixtures';

apiTest.describe(
  'Repair SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let transformHelper: SloTransformAssertions;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth, requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      transformHelper = createSloTransformAssertions(apiClient, esClient, async () =>
        samlAuth.session.getApiCredentialsForRole('admin')
      );
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest(
      'repairs missing rollup transform by recreating it',
      async ({ apiClient, esClient }) => {
        const createResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const sloId = createResponse.body.id as string;
        const sloRevision = 1;

        const rollupTransform = await transformHelper.assertExist(
          getSLOTransformId(sloId, sloRevision)
        );
        expect((rollupTransform as { transforms: unknown[] }).transforms).toHaveLength(1);

        await esClient.transform.deleteTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
          force: true,
        });

        await transformHelper.assertNotFound(getSLOTransformId(sloId, sloRevision));

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: [sloId] },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);

        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
      }
    );

    apiTest(
      'repairs missing summary transform by recreating it',
      async ({ apiClient, esClient }) => {
        const createResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const sloId = createResponse.body.id as string;
        const sloRevision = 1;

        const summaryTransform = await transformHelper.assertExist(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
        expect((summaryTransform as { transforms: unknown[] }).transforms).toHaveLength(1);

        await esClient.transform.deleteTransform({
          transform_id: getSLOSummaryTransformId(sloId, sloRevision),
          force: true,
        });

        await transformHelper.assertNotFound(getSLOSummaryTransformId(sloId, sloRevision));

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: [sloId] },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);

        await transformHelper.assertTransformIsStarted(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
      }
    );

    apiTest(
      'repairs stopped transform by starting it when SLO is enabled',
      async ({ apiClient, esClient }) => {
        const createResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const sloId = createResponse.body.id as string;
        const sloRevision = 1;

        await transformHelper.assertExist(getSLOTransformId(sloId, sloRevision));

        await esClient.transform.stopTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
          wait_for_completion: true,
        });

        await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: [sloId] },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);

        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
      }
    );

    apiTest(
      'repairs started transform by stopping it when SLO should be disabled',
      async ({ apiClient }) => {
        const createResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const sloId = createResponse.body.id as string;
        const sloRevision = 1;

        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));

        const dis = await apiClient.post(`api/observability/slos/${sloId}/disable`, {
          headers,
          responseType: 'json',
        });
        expect(dis).toHaveStatusCode(204);

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: [sloId] },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);

        await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));
      }
    );

    apiTest(
      'repairs missing rollup transform for disabled SLO by recreating and stopping it',
      async ({ apiClient, esClient }) => {
        const createResponse = await apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);
        const sloId = createResponse.body.id as string;
        const sloRevision = 1;

        const rollupTransform = await transformHelper.assertExist(
          getSLOTransformId(sloId, sloRevision)
        );
        expect((rollupTransform as { transforms: unknown[] }).transforms).toHaveLength(1);

        const dis = await apiClient.post(`api/observability/slos/${sloId}/disable`, {
          headers,
          responseType: 'json',
        });
        expect(dis).toHaveStatusCode(204);

        await esClient.transform.deleteTransform({
          transform_id: getSLOTransformId(sloId, sloRevision),
        });

        await transformHelper.assertNotFound(getSLOTransformId(sloId, sloRevision));

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: [sloId] },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);

        await transformHelper.assertTransformIsStopped(getSLOTransformId(sloId, sloRevision));
      }
    );

    apiTest('returns noop for multiple healthy SLOs', async ({ apiClient }) => {
      const [slo1, slo2, slo3] = await Promise.all([
        apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        }),
        apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        }),
        apiClient.post('api/observability/slos', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        }),
      ]);
      expect(slo1).toHaveStatusCode(200);
      expect(slo2).toHaveStatusCode(200);
      expect(slo3).toHaveStatusCode(200);

      const sloIds = [slo1.body.id, slo2.body.id, slo3.body.id] as string[];
      const sloRevision = 1;

      for (const sloId of sloIds) {
        await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
        await transformHelper.assertTransformIsStarted(
          getSLOSummaryTransformId(sloId, sloRevision)
        );
      }

      const repairRes = await apiClient.post('api/observability/slos/_repair', {
        headers,
        body: { list: sloIds },
        responseType: 'json',
      });
      expect(repairRes).toHaveStatusCode(207);
      const results = repairRes.body as RepairActionsGroupResult[];

      expect(results).toHaveLength(3);
      for (const result of results) {
        expect(sloIds).toContain(result.id);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].action.type).toBe('noop');
        expect(result.results[0].status).toBe('success');
      }
    });

    apiTest(
      'returns noop for healthy SLOs and start-transform for SLO with stopped transforms',
      async ({ apiClient, esClient }) => {
        const [slo1, slo2, slo3] = await Promise.all([
          apiClient.post('api/observability/slos', {
            headers,
            body: DEFAULT_SLO,
            responseType: 'json',
          }),
          apiClient.post('api/observability/slos', {
            headers,
            body: DEFAULT_SLO,
            responseType: 'json',
          }),
          apiClient.post('api/observability/slos', {
            headers,
            body: DEFAULT_SLO,
            responseType: 'json',
          }),
        ]);
        expect(slo1).toHaveStatusCode(200);
        expect(slo2).toHaveStatusCode(200);
        expect(slo3).toHaveStatusCode(200);

        const sloIds = [slo1.body.id, slo2.body.id, slo3.body.id] as string[];
        const sloRevision = 1;
        const stoppedSloId = sloIds[2];

        for (const sloId of sloIds) {
          await transformHelper.assertTransformIsStarted(getSLOTransformId(sloId, sloRevision));
          await transformHelper.assertTransformIsStarted(
            getSLOSummaryTransformId(sloId, sloRevision)
          );
        }

        await esClient.transform.stopTransform({
          transform_id: getSLOTransformId(stoppedSloId, sloRevision),
          wait_for_completion: true,
        });
        await esClient.transform.stopTransform({
          transform_id: getSLOSummaryTransformId(stoppedSloId, sloRevision),
          wait_for_completion: true,
        });

        await transformHelper.assertTransformIsStopped(
          getSLOTransformId(stoppedSloId, sloRevision)
        );
        await transformHelper.assertTransformIsStopped(
          getSLOSummaryTransformId(stoppedSloId, sloRevision)
        );

        const repairRes = await apiClient.post('api/observability/slos/_repair', {
          headers,
          body: { list: sloIds },
          responseType: 'json',
        });
        expect(repairRes).toHaveStatusCode(207);
        const results = repairRes.body as RepairActionsGroupResult[];

        expect(results).toHaveLength(3);

        const healthySloIds = [sloIds[0], sloIds[1]];
        for (const healthySloId of healthySloIds) {
          const healthyResult = results.find((r) => r.id === healthySloId);
          expect(healthyResult).toBeDefined();
          expect(healthyResult!.results).toHaveLength(1);
          expect(healthyResult!.results[0].action.type).toBe('noop');
          expect(healthyResult!.results[0].status).toBe('success');
        }

        const stoppedResult = results.find((r) => r.id === stoppedSloId);
        expect(stoppedResult).toBeDefined();
        expect(stoppedResult!.results).toHaveLength(2);

        const actionTypes = stoppedResult!.results.map((r) => r.action.type);
        expect(actionTypes).toContain('start-transform');
        expect(actionTypes.filter((t) => t === 'start-transform')).toHaveLength(2);

        const transformTypes = stoppedResult!.results.map((r) => r.action.transformType);
        expect(transformTypes).toContain('rollup');
        expect(transformTypes).toContain('summary');

        for (const result of stoppedResult!.results) {
          expect(result.status).toBe('success');
        }

        await transformHelper.assertTransformIsStarted(
          getSLOTransformId(stoppedSloId, sloRevision)
        );
        await transformHelper.assertTransformIsStarted(
          getSLOSummaryTransformId(stoppedSloId, sloRevision)
        );
      }
    );
  }
);
