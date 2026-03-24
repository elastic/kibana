/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, type SloScoutApi } from '../fixtures';

apiTest.describe(
  'Get SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let sloApi: SloScoutApi;

    apiTest.beforeAll(async ({ apiServices, sloFtrDataForgeSuite }) => {
      await sloFtrDataForgeSuite.setup();
      sloApi = apiServices.slo;
    });

    apiTest.afterAll(async ({ sloFtrDataForgeSuite }) => {
      await sloFtrDataForgeSuite.teardown();
    });

    apiTest('get SLO by id', async () => {
      const createRes1 = await sloApi.create(DEFAULT_SLO);
      expect(createRes1).toHaveStatusCode(200);
      const createRes2 = await sloApi.create({
        ...DEFAULT_SLO,
        name: 'something irrelevant foo',
      });
      expect(createRes2).toHaveStatusCode(200);

      const sloId1 = createRes1.body.id as string;

      const getSloResponse = await sloApi.get(sloId1);
      expect(getSloResponse).toHaveStatusCode(200);
      const body = getSloResponse.body as Record<string, unknown>;
      expect(body.summary).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.instanceId).toBeDefined();
      expect(body.budgetingMethod).toBe('occurrences');
      expect(body.timeWindow).toStrictEqual({ duration: '7d', type: 'rolling' });
    });
  }
);
