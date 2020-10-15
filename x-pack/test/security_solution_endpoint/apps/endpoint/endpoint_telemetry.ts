/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const telemetryTestResources = getService('telemetryTestResources');

  describe('security solution endpoint telemetry', () => {
    after(async () => {
      await esArchiver.load('empty_kibana');
    });

    describe('when no agents are connected', () => {
      before(async () => {
        await esArchiver.load('empty_kibana');
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
        await esArchiver.load('endpoint/telemetry/agent_only');
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
        await esArchiver.load('endpoint/telemetry/checkin_now');
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
        await esArchiver.load('endpoint/telemetry/checkin_2_days_ago');
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
        await esArchiver.load('endpoint/telemetry/endpoint_malware_enabled');
      });

      it('reports the correct number of windows and macos endpoints under policies malware', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.policies.malware.active).to.eql(2);
        expect(endpointTelemetry.policies.malware.inactive).to.eql(0);
      });
    });
    describe('when agents are connected with endpoints integration malware disabled', () => {
      before(async () => {
        await esArchiver.load('endpoint/telemetry/endpoint_malware_disabled');
      });
      it('reports the correct number of windows and macos endpoints under policies malware', async () => {
        const endpointTelemetry = await telemetryTestResources.getEndpointTelemetry();
        expect(endpointTelemetry.policies.malware.active).to.eql(0);
        expect(endpointTelemetry.policies.malware.inactive).to.eql(2);
      });
    });
    describe('when agents are connected with endpoints integration uninstalled', () => {
      before(async () => {
        await esArchiver.load('endpoint/telemetry/endpoint_uninstalled');
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
  });
}
