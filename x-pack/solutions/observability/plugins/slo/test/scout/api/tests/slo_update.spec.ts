/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../../../common/constants';
import {
  apiTest,
  createSloTransformAssertions,
  DEFAULT_SLO,
  type SloScoutApi,
  type SloTransformAssertions,
} from '../fixtures';

apiTest.describe(
  'Update SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let sloApi: SloScoutApi;
    let transformHelper: SloTransformAssertions;

    apiTest.beforeAll(
      async ({ apiServices, apiClient, esClient, samlAuth, sloFtrDataForgeSuite }) => {
        await sloFtrDataForgeSuite.setup();
        sloApi = apiServices.slo;
        transformHelper = createSloTransformAssertions(apiClient, esClient, async () =>
          samlAuth.session.getApiCredentialsForRole('admin')
        );
      }
    );

    apiTest.afterAll(async ({ sloFtrDataForgeSuite }) => {
      await sloFtrDataForgeSuite.teardown();
    });

    apiTest('with revision bump updates the definition', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO);
      expect(createResponse).toHaveStatusCode(200);
      const sloId = createResponse.body.id as string;

      const getResponse = await sloApi.get(sloId);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toMatchObject({ revision: 1 });

      const updateResponse = await sloApi.update({
        sloId,
        slo: { ...DEFAULT_SLO, objective: { target: 0.63 } },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toMatchObject({ revision: 2, objective: { target: 0.63 } });

      await transformHelper.assertNotFound(getSLOTransformId(sloId, 1));
      await transformHelper.assertNotFound(getSLOSummaryTransformId(sloId, 1));

      await transformHelper.assertExist(getSLOTransformId(sloId, 2));
      await transformHelper.assertExist(getSLOSummaryTransformId(sloId, 2));
    });

    apiTest('without revision bump updates the definition', async () => {
      const createResponse = await sloApi.create(DEFAULT_SLO);
      expect(createResponse).toHaveStatusCode(200);
      const sloId = createResponse.body.id as string;

      const getResponse = await sloApi.get(sloId);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toMatchObject({ revision: 1 });

      const updateResponse = await sloApi.update({
        sloId,
        slo: { ...DEFAULT_SLO, name: 'updated name' },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toMatchObject({ revision: 1, name: 'updated name' });

      await transformHelper.assertExist(getSLOTransformId(sloId, 1));
      await transformHelper.assertExist(getSLOSummaryTransformId(sloId, 1));
    });

    apiTest('without revision bump updates dashboard artifacts', async () => {
      const createResp = await sloApi.create(DEFAULT_SLO);
      expect(createResp).toHaveStatusCode(200);
      const sloId = createResp.body.id as string;

      const updateResponse = await sloApi.update({
        sloId,
        slo: {
          ...DEFAULT_SLO,
          artifacts: { dashboards: [{ id: 'dash-x' }, { id: 'dash-y' }] },
        },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body).toMatchObject({
        revision: 1,
        artifacts: { dashboards: [{ id: 'dash-x' }, { id: 'dash-y' }] },
      });
      await transformHelper.assertExist(getSLOTransformId(sloId, 1));
      await transformHelper.assertExist(getSLOSummaryTransformId(sloId, 1));
    });
  }
);
