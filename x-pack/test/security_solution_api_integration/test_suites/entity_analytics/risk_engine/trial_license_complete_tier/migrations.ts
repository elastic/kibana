/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  riskEngineRouteHelpersFactory,
  assetCriticalityRouteHelpersFactory,
  entityAnalyticsRouteHelpersFactory,
  doesEventIngestedPipelineExist,
  simulateMissingPipelineBug,
  cleanAssetCriticality,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest);
  const log = getService('log');

  const riskEngineRoutesForSpace = (space: string) =>
    riskEngineRouteHelpersFactory(supertest, space);

  const assetCriticalityRoutesForSpace = (space: string) =>
    assetCriticalityRouteHelpersFactory(supertest, space);

  const SPACE_TEST_SPACES = ['space1', 'space2', 'space3'];

  describe('@ess @serverless @serverlessQA Risk Scoring Migrations', () => {
    beforeEach(async () => {
      for (const space of ['default', ...SPACE_TEST_SPACES]) {
        await cleanAssetCriticality({
          es,
          namespace: space,
          log,
        });

        await riskEngineRoutesForSpace(space).cleanUp();
      }
    });

    it('should install the event ingested ingest pipeline if it doesnt exist and risk scoring is enabled in the default space', async () => {
      await riskEngineRoutesForSpace('default').init();
      await simulateMissingPipelineBug({ es, log, space: 'default' });

      const pipelineExistsBefore = await doesEventIngestedPipelineExist({
        es,
        log,
      });

      expect(pipelineExistsBefore).equal(false);

      await entityAnalyticsRoutes.runMigrations();

      const pipelineExistsAfter = await doesEventIngestedPipelineExist({
        es,
        log,
      });

      expect(pipelineExistsAfter).equal(true);
    });

    it('should install the event ingested ingest pipeline if it doesnt exist in every space that risk engine is enabled in', async () => {
      for (const space of SPACE_TEST_SPACES) {
        await riskEngineRoutesForSpace(space).init();
        await simulateMissingPipelineBug({ es, log, space });
      }

      await entityAnalyticsRoutes.runMigrations();

      for (const space of SPACE_TEST_SPACES) {
        const pipelineExists = await doesEventIngestedPipelineExist({
          es,
          log,
          space,
        });

        expect(pipelineExists).equal(true);
      }
    });

    it('should install the event ingested ingest pipeline if it doesnt exist and asset criticality is enabled in the default space', async () => {
      // assigning asset criticality initialses the asset criticality index
      await assetCriticalityRoutesForSpace('default').upsert({
        id_field: 'host.name',
        id_value: 'some-host',
        criticality_level: 'high_impact',
      });

      await simulateMissingPipelineBug({ es, log, space: 'default' });

      const pipelineExistsBefore = await doesEventIngestedPipelineExist({
        es,
        log,
      });

      expect(pipelineExistsBefore).equal(false);

      await entityAnalyticsRoutes.runMigrations();

      const pipelineExistsAfter = await doesEventIngestedPipelineExist({
        es,
        log,
      });

      expect(pipelineExistsAfter).equal(true);
    });

    it('should install the event ingested ingest pipeline if it doesnt exist in every space that asset criticality is enabled in', async () => {
      for (const space of SPACE_TEST_SPACES) {
        await assetCriticalityRoutesForSpace(space).upsert({
          id_field: 'host.name',
          id_value: `some-host-${space}`,
          criticality_level: 'high_impact',
        });

        await simulateMissingPipelineBug({ es, log, space });
      }

      await entityAnalyticsRoutes.runMigrations();

      for (const space of SPACE_TEST_SPACES) {
        const pipelineExists = await doesEventIngestedPipelineExist({
          es,
          log,
          space,
        });

        expect(pipelineExists).equal(true);
      }
    });
  });
};
