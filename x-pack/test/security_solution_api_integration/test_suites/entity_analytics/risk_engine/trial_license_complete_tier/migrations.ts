/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  riskEngineRouteHelpersFactory,
  entityAnalyticsRouteHelpersFactory,
  doesEventIngestedPipelineExist,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const riskEngineRoutes = riskEngineRouteHelpersFactory(supertest);
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest);
  const log = getService('log');

  describe('@ess @serverless @serverlessQA Risk Scoring Migrations', () => {
    // before(async () => {});

    // after(async () => {});

    // afterEach(async () => {});

    it('should install the default ingest pipeline if it doesnt exist', async () => {
      await riskEngineRoutes.init();
      await simulateMissingPipelineBug({ es, log });
      await entityAnalyticsRoutes.runMigrations();

      const pipelineExists = doesEventIngestedPipelineExist({
        es,
        log,
      });

      expect(pipelineExists).equals(true);
    });
  });
};
