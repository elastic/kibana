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
  downgradeRiskEngineIndexVersion,
  getRiskEngineIndexVersion,
  getRiskScoreWriteIndexMappingAndSettings,
  getRiskScoreLatestIndexMappingAndSettings,
  removeDefaultPipelineFromRiskScoreIndices,
  getAssetCriticalityIndexVersion,
  setAssetCriticalityIndexVersion,
  getAssetCriticalityMappingAndSettings,
  getAssetCriticalityEsDocument,
  getRiskScoreIndexTemplate,
} from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest);
  const log = getService('log');

  const riskEngineRoutesForSpace = (space: string) =>
    riskEngineRouteHelpersFactory(supertest, space);

  const assetCriticalityRoutesForSpace = (space: string) =>
    assetCriticalityRouteHelpersFactory(supertest, space);

  const SPACE_TEST_SPACES = ['space1', 'space2', 'space3'];

  describe('@ess @serverless @skipInServerlessMKI Entity Analytics Migrations', () => {
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
    describe('Event ingested pipeline fix', () => {
      // customer has upgraded to 8.18 or 9.0 and the ingest pipeline was not created
      // they either have asset criticality or risk scoring or both enabled
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

      it('should install the event ingested ingest pipeline if it doesnt exist and both risk scoring and asset criticality are enabled in the default space', async () => {
        await riskEngineRoutesForSpace('default').init();
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

      it('should not error if the event ingested pipeline already exists in the default space', async () => {
        await riskEngineRoutesForSpace('default').init();
        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-host',
          criticality_level: 'high_impact',
        });

        const pipelineExistsBefore = await doesEventIngestedPipelineExist({
          es,
          log,
        });

        expect(pipelineExistsBefore).equal(true);

        await entityAnalyticsRoutes.runMigrations();

        const pipelineExistsAfter = await doesEventIngestedPipelineExist({
          es,
          log,
        });

        expect(pipelineExistsAfter).equal(true);
      });
    });

    describe('Risk Engine index upgrade', () => {
      let CURRENT_INDEX_VERSION: number | undefined;

      const downgradeIndexVersion = async (space: string) => {
        if (!CURRENT_INDEX_VERSION) {
          throw new Error('Current mappings version is not defined');
        }

        await downgradeRiskEngineIndexVersion({
          es,
          space,
          mappingsVersion: CURRENT_INDEX_VERSION - 1,
        });
      };

      before(async () => {
        await riskEngineRoutesForSpace('default').init();

        CURRENT_INDEX_VERSION = await getRiskEngineIndexVersion({
          kibanaServer,
          space: 'default',
        });

        if (!CURRENT_INDEX_VERSION) {
          throw new Error('Current mappings version is not defined');
        }
      });

      it('should upgrade the risk engine index in the default space', async () => {
        // basic test to ensure the migration runs and updates the index version
        await riskEngineRoutesForSpace('default').init();
        await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        expect(
          await getRiskEngineIndexVersion({
            kibanaServer,
            space: 'default',
          })
        ).to.be(CURRENT_INDEX_VERSION);
      });

      it('should set the default pipeline on the risk scores index if it does not exist in the default space', async () => {
        // simulates the customer upgrading to 8.18 but their risk score data stream has not rolled over yet
        // so their write index for risk scores does not have the default pipeline set
        await riskEngineRoutesForSpace('default').init();
        await removeDefaultPipelineFromRiskScoreIndices({ es, log, space: 'default' });
        await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        const { settings: writeIndexSettings } = await getRiskScoreWriteIndexMappingAndSettings(
          es,
          'default'
        );

        expect(writeIndexSettings?.index?.default_pipeline).to.be(
          `entity_analytics_create_eventIngest_from_timestamp-pipeline-default`
        );

        const indexTemplate = await getRiskScoreIndexTemplate(es, 'default');

        expect(indexTemplate?.settings?.index?.default_pipeline).to.be(
          `entity_analytics_create_eventIngest_from_timestamp-pipeline-default`
        );

        const { settings: latestIndexSettings } = await getRiskScoreLatestIndexMappingAndSettings(
          es,
          'default'
        );

        expect(latestIndexSettings?.index?.default_pipeline).to.be(undefined);
      });

      it('should set the default pipeline on the risk scores index if it does not exist in every space that risk engine is enabled in', async () => {
        for (const space of SPACE_TEST_SPACES) {
          await riskEngineRoutesForSpace(space).init();
          await removeDefaultPipelineFromRiskScoreIndices({ es, log, space });
          await downgradeIndexVersion(space);
        }

        await entityAnalyticsRoutes.runMigrations();

        for (const space of SPACE_TEST_SPACES) {
          const indexTemplate = await getRiskScoreIndexTemplate(es, space);

          expect(indexTemplate?.settings?.index?.default_pipeline).to.be(
            `entity_analytics_create_eventIngest_from_timestamp-pipeline-${space}`
          );

          const { settings: writeIndexSettings } = await getRiskScoreWriteIndexMappingAndSettings(
            es,
            space
          );

          expect(writeIndexSettings?.index?.default_pipeline).to.be(
            `entity_analytics_create_eventIngest_from_timestamp-pipeline-${space}`
          );

          const { settings: latestIndexSettings } = await getRiskScoreLatestIndexMappingAndSettings(
            es,
            space
          );
          expect(latestIndexSettings?.index?.default_pipeline).to.be(undefined);
        }
      });
    });

    describe('Asset Criticality index upgrade', () => {
      let CURRENT_INDEX_VERSION: number | undefined;

      const downgradeIndexVersion = async (space: string) => {
        if (!CURRENT_INDEX_VERSION) {
          throw new Error('Current mappings version is not defined');
        }

        await setAssetCriticalityIndexVersion({
          es,
          version: CURRENT_INDEX_VERSION - 1,
          space,
        });
      };

      before(async () => {
        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-host',
          criticality_level: 'high_impact',
        });

        CURRENT_INDEX_VERSION = await getAssetCriticalityIndexVersion({
          es,
          space: 'default',
        });

        if (!CURRENT_INDEX_VERSION) {
          throw new Error('Current asset crticiality mappings version is not defined');
        }
      });

      it('should upgrade the asset criticality index in the default space', async () => {
        // basic test to ensure the migration runs and updates the index version
        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-host',
          criticality_level: 'high_impact',
        });
        await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        expect(
          await getAssetCriticalityIndexVersion({
            es,
            space: 'default',
          })
        ).to.be(CURRENT_INDEX_VERSION);
      });

      it('should upgrade the asset criticality index in every space that asset criticality is enabled in', async () => {
        for (const space of SPACE_TEST_SPACES) {
          await assetCriticalityRoutesForSpace(space).upsert({
            id_field: 'host.name',
            id_value: `some-host-${space}`,
            criticality_level: 'high_impact',
          });
          await downgradeIndexVersion(space);
        }
        await entityAnalyticsRoutes.runMigrations();

        for (const space of SPACE_TEST_SPACES) {
          expect(
            await getAssetCriticalityIndexVersion({
              es,
              space,
            })
          ).to.be(CURRENT_INDEX_VERSION);
        }
      });

      it('should set the default pipeline on the asset criticality index if it does not exist in the default space', async () => {
        // simulates the customer upgrading to 8.18, the pipeline is not set on the asset criticality index
        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-host',
          criticality_level: 'high_impact',
        });
        await removeDefaultPipelineFromRiskScoreIndices({ es, log, space: 'default' });
        await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        const { settings } = await getAssetCriticalityMappingAndSettings(es, 'default');

        expect(settings?.index?.default_pipeline).to.be(
          `entity_analytics_create_eventIngest_from_timestamp-pipeline-default`
        );
      });

      it('Asset criticality assignment should work after the event ingested ingest pipeline is installed', async () => {
        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-host',
          criticality_level: 'high_impact',
        });
        await simulateMissingPipelineBug({ es, log, space: 'default' });
        await downgradeIndexVersion('default');
        await entityAnalyticsRoutes.runMigrations();

        await assetCriticalityRoutesForSpace('default').upsert({
          id_field: 'host.name',
          id_value: 'some-other-host',
          criticality_level: 'medium_impact',
        });

        const criticalityRecord = await getAssetCriticalityEsDocument({
          es,
          idField: 'host.name',
          idValue: 'some-other-host',
          space: 'default',
        });

        expect(criticalityRecord).not.to.be(undefined);
        expect(criticalityRecord!.criticality_level).to.be('medium_impact');
        // @ts-expect-error - event.ingested is not in the types, but should be set by the ingest pipeline
        expect(criticalityRecord!.event.ingested).not.to.be(undefined);
      });
    });
  });
};
