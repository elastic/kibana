/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRoutePaths } from '@kbn/profiling-plugin/common';
import expect from '@kbn/expect';
import { ProfilingStatusCheck } from '@kbn/profiling-utils';
import { FtrProviderContext } from '../common/ftr_provider_context';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');

  registry.when(
    'Profiling is not set up and no data is loaded',
    { config: 'basic', skipLoadingData: true },
    () => {
      describe('Admin user', () => {
        let statusCheck: ProfilingStatusCheck;
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
        let statusCheck: ProfilingStatusCheck;
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

        it(`is unauthorized to fully check profiling status `, async () => {
          expect(statusCheck.unauthorized).to.be(true);
        });
      });
    }
  );

  registry.when(
    'Profiling is set up and no data is loaded',
    { config: 'cloud', skipLoadingData: true },
    () => {
      describe.skip('Admin user', () => {
        let statusCheck: ProfilingStatusCheck;
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
        let statusCheck: ProfilingStatusCheck;
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

        it(`is unauthorized to fully check profiling status `, async () => {
          expect(statusCheck.unauthorized).to.be(true);
        });
      });
    }
  );

  registry.when('Profiling is set up and data is loaded', { config: 'cloud' }, () => {
    describe.skip('Admin user', () => {
      let statusCheck: ProfilingStatusCheck;
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
      let statusCheck: ProfilingStatusCheck;
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

      it(`is unauthorized to fully check profiling status `, async () => {
        expect(statusCheck.unauthorized).to.be(true);
      });
    });
  });
}
