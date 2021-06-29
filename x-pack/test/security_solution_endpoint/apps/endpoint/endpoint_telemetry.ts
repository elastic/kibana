/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const telemetryTestResources = getService('telemetryTestResources');

  // The source of the data for these tests have changed and need to be updated
  // There are currently tests in the security_solution application being maintained
  describe.skip('security solution endpoint telemetry', () => {
    after(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('when no agents are connected', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      });

      it('reports no endpoints or policies', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry).to.eql({
          total_installed: 0,
          active_within_last_24_hours: 0,
          os: [],
          policies: {
            malware: {
              active: 0,
              inactive: 0,
              failure: 0,
            },
          },
        });
      });
    });
    describe('when agents are connected with endpoint integration disabled', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/endpoint/telemetry/agent_only');
      });

      it('reports no endpoints or policies', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry).to.eql({
          total_installed: 0,
          active_within_last_24_hours: 0,
          os: [],
          policies: {
            malware: {
              active: 0,
              inactive: 0,
              failure: 0,
            },
          },
        });
      });
    });
    describe('when agents are connected with endpoints seen in past 24 hours', () => {
      before(async () => {
        await telemetryTestResources.getArchiveSetCheckIn(
          'endpoint_malware_enabled',
          'checkin_now',
          0
        );
        await esArchiver.load('x-pack/test/functional/es_archives/endpoint/telemetry/checkin_now');
        await telemetryTestResources.deleteArchive('checkin_now');
      });

      it('reports the correct number of endpoints seen total and in past 24 hours', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.total_installed).to.eql(3);
        expect(endpointTelemetry.active_within_last_24_hours).to.eql(3);
      });
      it('reports the separate OS types of installed endpoints', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.os.length).to.eql(3);
        const osPlatforms: string[] = [];
        endpointTelemetry.os.forEach((os) => {
          expect(os.count).to.eql(1);
          osPlatforms.push(os.platform);
        });
        expect(osPlatforms).to.contain('windows');
        expect(osPlatforms).to.contain('darwin');
        expect(osPlatforms).to.contain('ubuntu');
      });
    });
    describe('when agents are connected with endpoints not seen in past 24 hours', () => {
      before(async () => {
        await telemetryTestResources.getArchiveSetCheckIn(
          'endpoint_malware_enabled',
          'checkin_2_days_ago',
          2
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/endpoint/telemetry/checkin_2_days_ago'
        );
        await telemetryTestResources.deleteArchive('checkin_2_days_ago');
      });

      it('reports the correct number of endpoints seen total and in past 24 hours', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.total_installed).to.eql(3);
        expect(endpointTelemetry.active_within_last_24_hours).to.eql(0);
      });
      it('reports the separate OS types of installed endpoints', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.os.length).to.eql(3);
        const osPlatforms: string[] = [];
        endpointTelemetry.os.forEach((os) => {
          expect(os.count).to.eql(1);
          osPlatforms.push(os.platform);
        });
        expect(osPlatforms).to.contain('windows');
        expect(osPlatforms).to.contain('darwin');
        expect(osPlatforms).to.contain('ubuntu');
      });
    });
    describe('when agents are connected with endpoints integration malware enabled', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/endpoint/telemetry/endpoint_malware_enabled'
        );
      });

      it('reports the correct number of windows and macos endpoints under policies malware', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.policies.malware.active).to.eql(2);
        expect(endpointTelemetry.policies.malware.inactive).to.eql(0);
      });
    });
    describe('when agents are connected with endpoints integration malware disabled', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/endpoint/telemetry/endpoint_malware_disabled'
        );
      });
      it('reports the correct number of windows and macos endpoints under policies malware', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.policies.malware.active).to.eql(0);
        expect(endpointTelemetry.policies.malware.inactive).to.eql(2);
      });
    });
    describe('when agents are connected with endpoints integration uninstalled', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/endpoint/telemetry/endpoint_uninstalled'
        );
      });
      it('reports no endpoints or policies', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry).to.eql({
          total_installed: 0,
          active_within_last_24_hours: 0,
          os: [],
          policies: {
            malware: {
              active: 0,
              inactive: 0,
              failure: 0,
            },
          },
        });
      });
    });
    describe('when agents are connected with cloned endpoints', () => {
      describe('with endpoint integration installed with malware enabled', () => {
        before(async () => {
          await telemetryTestResources.getArchiveSetCheckIn(
            'cloned_endpoint_installed',
            'cloned_endpoint_test',
            0
          );
          await esArchiver.load(
            'x-pack/test/functional/es_archives/endpoint/telemetry/cloned_endpoint_test'
          );
          await telemetryTestResources.deleteArchive('cloned_endpoint_test');
        });
        it('reports all endpoints and policies', async () => {
          const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
          expect(endpointTelemetry).to.eql({
            total_installed: 6,
            active_within_last_24_hours: 6,
            os: [
              {
                full_name: 'Ubuntu bionic(18.04.1 LTS (Bionic Beaver))',
                platform: 'ubuntu',
                version: '18.04.1 LTS (Bionic Beaver)',
                count: 2,
              },
              {
                full_name: 'Mac OS X(10.14.1)',
                platform: 'darwin',
                version: '10.14.1',
                count: 2,
              },
              {
                full_name: 'Windows 10 Pro(10.0)',
                platform: 'windows',
                version: '10.0',
                count: 2,
              },
            ],
            policies: {
              malware: {
                active: 4,
                inactive: 0,
                failure: 0,
              },
            },
          });
        });
      });
      describe('with endpoint integration installed on half the endpoints with malware enabled', () => {
        before(async () => {
          await telemetryTestResources.getArchiveSetCheckIn(
            'cloned_endpoint_different_states',
            'cloned_endpoint_test',
            0
          );
          await esArchiver.load(
            'x-pack/test/functional/es_archives/endpoint/telemetry/cloned_endpoint_test'
          );
          await telemetryTestResources.deleteArchive('cloned_endpoint_test');
        });
        it('reports all endpoints and policies', async () => {
          const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
          expect(endpointTelemetry).to.eql({
            total_installed: 3,
            active_within_last_24_hours: 3,
            os: [
              {
                full_name: 'Mac OS X(10.14.1)',
                platform: 'darwin',
                version: '10.14.1',
                count: 1,
              },
              {
                full_name: 'Ubuntu bionic(18.04.1 LTS (Bionic Beaver))',
                platform: 'ubuntu',
                version: '18.04.1 LTS (Bionic Beaver)',
                count: 1,
              },
              {
                full_name: 'Windows 10 Pro(10.0)',
                platform: 'windows',
                version: '10.0',
                count: 1,
              },
            ],
            policies: {
              malware: {
                active: 2,
                inactive: 0,
                failure: 0,
              },
            },
          });
        });
      });
      describe('with endpoint integration uninstalled', () => {
        before(async () => {
          await telemetryTestResources.getArchiveSetCheckIn(
            'cloned_endpoint_uninstalled',
            'cloned_endpoint_test',
            0
          );
          await esArchiver.load(
            'x-pack/test/functional/es_archives/endpoint/telemetry/cloned_endpoint_test'
          );
          await telemetryTestResources.deleteArchive('cloned_endpoint_test');
        });
        it('reports all endpoints and policies', async () => {
          const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
          expect(endpointTelemetry).to.eql({
            total_installed: 0,
            active_within_last_24_hours: 0,
            os: [],
            policies: {
              malware: {
                active: 0,
                inactive: 0,
                failure: 0,
              },
            },
          });
        });
      });
    });
  });
}
