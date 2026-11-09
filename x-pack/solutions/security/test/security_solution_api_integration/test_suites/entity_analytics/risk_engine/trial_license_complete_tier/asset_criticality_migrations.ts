/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  assetCriticalityRouteHelpersFactory,
  cleanAssetCriticality,
  doesEventIngestedPipelineExist,
  entityAnalyticsRouteHelpersFactory,
  getAssetCriticalityEsDocument,
  getAssetCriticalityIndexVersion,
  getAssetCriticalityMappingAndSettings,
  removeDefaultPipelineFromAssetCriticalityIndex,
  setAssetCriticalityIndexVersion,
  simulateMissingPipelineBug,
} from '../../utils';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const spaces = getService('spaces');
  const entityAnalyticsRoutes = entityAnalyticsRouteHelpersFactory(supertest, log);

  const assetCriticalityRoutesForSpace = (space: string) =>
    assetCriticalityRouteHelpersFactory(supertest, space);

  const SPACE_TEST_SPACES = ['ea-ac-mig-1', 'ea-ac-mig-2', 'ea-ac-mig-3'];

  const upsertHost = (space: string, idValue: string, criticalityLevel = 'high_impact') =>
    assetCriticalityRoutesForSpace(space).upsert({
      id_field: 'host.name',
      id_value: idValue,
      criticality_level: criticalityLevel,
    });

  describe('@ess @serverless @skipInServerlessMKI Asset criticality migrations', () => {
    before(async () => {
      for (const space of SPACE_TEST_SPACES) {
        await spaces.create({
          id: space,
          name: space,
          description: `Space for ${space}`,
          disabledFeatures: [],
        });
      }
    });

    beforeEach(async () => {
      for (const space of ['default', ...SPACE_TEST_SPACES]) {
        await cleanAssetCriticality({ es, namespace: space, log });
      }
    });

    after(async () => {
      for (const space of ['default', ...SPACE_TEST_SPACES]) {
        await cleanAssetCriticality({ es, namespace: space, log });
      }
      for (const space of SPACE_TEST_SPACES) {
        await spaces.delete(space);
      }
    });

    describe('Event ingested pipeline fix', () => {
      it('installs the pipeline when asset criticality is enabled in the default space', async () => {
        await upsertHost('default', 'some-host');
        await simulateMissingPipelineBug({ es, log, space: 'default' });

        expect(await doesEventIngestedPipelineExist({ es, log })).equal(false);

        await entityAnalyticsRoutes.runMigrations();

        expect(await doesEventIngestedPipelineExist({ es, log })).equal(true);
      });

      it('installs the pipeline in every space where asset criticality is enabled', async () => {
        for (const space of SPACE_TEST_SPACES) {
          await upsertHost(space, `some-host-${space}`);
          await simulateMissingPipelineBug({ es, log, space });
        }

        for (const space of SPACE_TEST_SPACES) {
          await entityAnalyticsRouteHelpersFactory(supertest, log, space).runMigrations();
        }

        for (const space of SPACE_TEST_SPACES) {
          expect(await doesEventIngestedPipelineExist({ es, log, space })).equal(true);
        }
      });

      it('leaves an existing pipeline in place', async () => {
        await upsertHost('default', 'some-host');

        expect(await doesEventIngestedPipelineExist({ es, log })).equal(true);

        await entityAnalyticsRoutes.runMigrations();

        expect(await doesEventIngestedPipelineExist({ es, log })).equal(true);
      });
    });

    describe('Asset criticality index upgrade', () => {
      const downgradeIndexVersion = async (space: string): Promise<number> => {
        const version = await getAssetCriticalityIndexVersion({ es, space });
        if (!version) {
          throw new Error('Current asset criticality mappings version is not defined');
        }

        await setAssetCriticalityIndexVersion({
          es,
          version: version - 1,
          space,
        });
        return version;
      };

      it('upgrades the asset criticality index in the default space', async () => {
        await upsertHost('default', 'some-host');
        const version = await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        expect(await getAssetCriticalityIndexVersion({ es, space: 'default' })).to.be(version);
      });

      it('upgrades the asset criticality index in every space where it is enabled', async () => {
        let version: number | undefined;
        for (const space of SPACE_TEST_SPACES) {
          await upsertHost(space, `some-host-${space}`);
          version = await downgradeIndexVersion(space);
        }

        if (version === undefined) {
          throw new Error('Current asset criticality mappings version is not defined');
        }

        for (const space of SPACE_TEST_SPACES) {
          await entityAnalyticsRouteHelpersFactory(supertest, log, space).runMigrations();
        }

        for (const space of SPACE_TEST_SPACES) {
          expect(await getAssetCriticalityIndexVersion({ es, space })).to.be(version);
        }
      });

      it('sets the default pipeline on the asset criticality index when it is missing', async () => {
        await upsertHost('default', 'some-host');
        await removeDefaultPipelineFromAssetCriticalityIndex({ es, log, space: 'default' });
        await downgradeIndexVersion('default');

        await entityAnalyticsRoutes.runMigrations();

        const { settings } = await getAssetCriticalityMappingAndSettings(es, 'default');
        expect(settings?.index?.default_pipeline).to.be(
          'entity_analytics_create_eventIngest_from_timestamp-pipeline-default'
        );
      });

      it('assigns asset criticality after the event ingested pipeline is installed', async () => {
        await upsertHost('default', 'some-host');
        await simulateMissingPipelineBug({ es, log, space: 'default' });
        await downgradeIndexVersion('default');
        await entityAnalyticsRoutes.runMigrations();

        await upsertHost('default', 'some-other-host', 'medium_impact');

        const criticalityRecord = await getAssetCriticalityEsDocument({
          es,
          idField: 'host.name',
          idValue: 'some-other-host',
          space: 'default',
        });

        expect(criticalityRecord).not.to.be(undefined);
        expect(criticalityRecord?.criticality_level).to.be('medium_impact');
        const eventIngested = (criticalityRecord as { event?: { ingested?: unknown } } | undefined)
          ?.event?.ingested;
        expect(eventIngested).not.to.be(undefined);
      });
    });
  });
};
