/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getRoutePaths } from '@kbn/profiling-plugin/common';
import { ProfilingStatus } from '@kbn/profiling-utils';
import { getBettertest } from '../common/bettertest';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { deletePackagePolicy, getProfilingPackagePolicyIds } from '../utils/fleet';
import { cleanUpProfilingData, loadProfilingData, setupProfiling } from '../utils/profiling_data';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const logger = getService('log');
  const es = getService('es');
  const retry = getService('retry');

  registry.when('Profiling status check', { config: 'cloud' }, () => {
    describe('Profiling is not set up and no data is loaded', () => {
      before(async () => {
        await cleanUpProfilingData({ es, logger, bettertest });
      });
      describe('Admin user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.adminUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });
      });

      describe('Viewer user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.readUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });

        it(`does not have required role to fully check profiling status`, async () => {
          expect(statusCheck.has_required_role).to.be(false);
        });
      });
    });

    describe('Collector integration is not installed', () => {
      let collectorId: string | undefined;
      before(async () => {
        await retry.tryForTime(240000, async () => {
          await setupProfiling(bettertest, logger);
        });
        const response = await getProfilingPackagePolicyIds(bettertest);
        collectorId = response.collectorId;
        if (collectorId) {
          await deletePackagePolicy(bettertest, collectorId);
        }
      });

      it('expects a collector integration to exist', () => {
        expect(collectorId).not.to.be(undefined);
      });

      describe('Admin user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.adminUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });
      });

      describe('Viewer user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.readUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });

        it(`does not have required role to fully check profiling status `, async () => {
          expect(statusCheck.has_required_role).to.be(false);
        });
      });
    });

    describe('Symbolizer integration is not installed', () => {
      let symbolizerId: string | undefined;
      before(async () => {
        await retry.tryForTime(240000, async () => {
          await setupProfiling(bettertest, logger);
        });
        const response = await getProfilingPackagePolicyIds(bettertest);
        symbolizerId = response.symbolizerId;
        if (symbolizerId) {
          await deletePackagePolicy(bettertest, symbolizerId);
        }
      });

      it('expectes a symbolizer integration to exist', () => {
        expect(symbolizerId).not.to.be(undefined);
      });

      describe('Admin user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.adminUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });
      });

      describe('Viewer user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.readUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has not been set up`, async () => {
          expect(statusCheck.has_setup).to.be(false);
        });

        it(`does not have data`, async () => {
          expect(statusCheck.has_data).to.be(false);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });

        it(`does not have required role to fully check profiling status `, async () => {
          expect(statusCheck.has_required_role).to.be(false);
        });
      });
    });

    describe('Profiling is set up', () => {
      before(async () => {
        await retry.tryForTime(240000, async () => {
          await cleanUpProfilingData({ es, logger, bettertest });
          await setupProfiling(bettertest, logger);
        });
      });

      describe('without data', () => {
        describe('Admin user', () => {
          let statusCheck: ProfilingStatus;
          before(async () => {
            const response = await profilingApiClient.adminUser({
              endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
            });
            statusCheck = response.body;
          });
          it(`has been set up`, async () => {
            expect(statusCheck.has_setup).to.be(true);
          });

          it(`does not have data`, async () => {
            expect(statusCheck.has_data).to.be(false);
          });

          it(`does not have pre 8.9.1 data`, async () => {
            expect(statusCheck.pre_8_9_1_data).to.be(false);
          });
        });

        describe('Viewer user', () => {
          let statusCheck: ProfilingStatus;
          before(async () => {
            const response = await profilingApiClient.readUser({
              endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
            });
            statusCheck = response.body;
          });
          it(`has been set up`, async () => {
            expect(statusCheck.has_setup).to.be(true);
          });

          it(`has data`, async () => {
            expect(statusCheck.has_data).to.be(false);
          });

          it(`does not have pre 8.9.1 data`, async () => {
            expect(statusCheck.pre_8_9_1_data).to.be(false);
          });

          it(`does not have required role to fully check profiling status `, async () => {
            expect(statusCheck.has_required_role).to.be(false);
          });
        });
      });

      describe('with data', () => {
        before(async () => {
          await retry.tryForTime(240000, async () => {
            await loadProfilingData(es, logger);
          });
        });
        describe('Admin user', () => {
          let statusCheck: ProfilingStatus;
          before(async () => {
            const response = await profilingApiClient.adminUser({
              endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
            });
            statusCheck = response.body;
          });
          it(`has been set up`, async () => {
            expect(statusCheck.has_setup).to.be(true);
          });

          it(`does not have data`, async () => {
            expect(statusCheck.has_data).to.be(true);
          });

          it(`does not have pre 8.9.1 data`, async () => {
            expect(statusCheck.pre_8_9_1_data).to.be(false);
          });
        });

        describe('Viewer user', () => {
          let statusCheck: ProfilingStatus;
          before(async () => {
            const response = await profilingApiClient.readUser({
              endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
            });
            statusCheck = response.body;
          });
          it(`has been set up`, async () => {
            expect(statusCheck.has_setup).to.be(true);
          });

          it(`has data`, async () => {
            expect(statusCheck.has_data).to.be(true);
          });

          it(`does not have pre 8.9.1 data`, async () => {
            expect(statusCheck.pre_8_9_1_data).to.be(false);
          });

          it(`does not have required role to fully check profiling status `, async () => {
            expect(statusCheck.has_required_role).to.be(false);
          });
        });
      });
    });

    describe('APM integration is not installed', () => {
      before(async () => {
        await retry.tryForTime(240000, async () => {
          await setupProfiling(bettertest, logger);
        });
      });

      describe('Admin user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.adminUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has been set up`, async () => {
          expect(statusCheck.has_setup).to.be(true);
        });

        it(`has data`, async () => {
          expect(statusCheck.has_data).to.be(true);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });
      });

      describe('Viewer user', () => {
        let statusCheck: ProfilingStatus;
        before(async () => {
          const response = await profilingApiClient.readUser({
            endpoint: `GET ${profilingRoutePaths.HasSetupESResources}`,
          });
          statusCheck = response.body;
        });
        it(`has been set up`, async () => {
          expect(statusCheck.has_setup).to.be(true);
        });

        it(`has data`, async () => {
          expect(statusCheck.has_data).to.be(true);
        });

        it(`does not have pre 8.9.1 data`, async () => {
          expect(statusCheck.pre_8_9_1_data).to.be(false);
        });

        it(`does not have required role to fully check profiling status `, async () => {
          expect(statusCheck.has_required_role).to.be(false);
        });
      });
    });
  });
}
