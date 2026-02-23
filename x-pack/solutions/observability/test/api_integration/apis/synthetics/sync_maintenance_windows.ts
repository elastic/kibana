/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  HTTPFields,
  PrivateLocation,
  ServiceLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { ConfigKey, LocationStatus } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { omitMonitorKeys } from './add_monitor';

export const LOCAL_LOCATION = {
  id: 'dev',
  label: 'Dev Service',
  geo: {
    lat: 0,
    lon: 0,
  },
  isServiceManaged: true,
};

export default function ({ getService }: FtrProviderContext) {
  describe('SyncMaintenanceWindows', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const kServer = getService('kibanaServer');

    let testFleetPolicyID: string;
    let loc: any;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;

    let mwObject: any;

    let newBrowserMonitorId: string;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    const params: Record<string, string> = {};

    before(async () => {
      await kServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();

      _browserMonitorJson = getFixtureJson('browser_monitor');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    beforeEach(() => {
      browserMonitorJson = _browserMonitorJson;
    });

    it('adds a test maintenance windows', async () => {
      mwObject = await monitorTestService.createMaintenanceWindow();
      mwObject.rRule = mwObject.r_rule;
    });
    it('adds a test param', async () => {
      const apiResponse = await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'http://proxy.com' });

      expect(apiResponse.status).eql(200);
    });

    it('create test private location', async () => {
      loc = await testPrivateLocations.createPrivateLocation();
      testFleetPolicyID = loc.agentPolicyId;
      const apiResponse = await supertestAPI.get(SYNTHETICS_API_URLS.SERVICE_LOCATIONS);
      const testLocations: Array<PrivateLocation | ServiceLocation> = [
        {
          id: 'dev',
          label: 'Dev Service',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: LocationStatus.EXPERIMENTAL,
          isInvalid: false,
        },
        {
          id: 'dev2',
          label: 'Dev Service 2',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: LocationStatus.EXPERIMENTAL,
          isInvalid: false,
        },
        {
          id: loc.id,
          isInvalid: false,
          isServiceManaged: false,
          label: 'Test private location 0',
          geo: {
            lat: 0,
            lon: 0,
          },
          agentPolicyId: testFleetPolicyID,
          spaces: ['*'],
        },
      ];
      expect(apiResponse.body.locations).eql(testLocations);
    });

    it('adds a monitor in private location', async () => {
      const newMonitor = browserMonitorJson;

      const pvtLoc = {
        id: loc.id,
        agentPolicyId: testFleetPolicyID,
        label: 'Test private location 0',
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
      };

      newMonitor.locations.push(pvtLoc);
      newMonitor.maintenance_windows = [mwObject.id];

      const apiResponse = await monitorTestService.createMonitor({ monitor: newMonitor });

      expect(apiResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          locations: [LOCAL_LOCATION, pvtLoc],
          spaces: ['default'],
        })
      );
      newBrowserMonitorId = apiResponse.rawBody.id;
    });

    it('verify integration for previously added monitor', async () => {
      const packagePolicy = await testPrivateLocations.getPackagePolicy({
        monitorId: newBrowserMonitorId,
        locId: loc.id,
      });

      expect(packagePolicy?.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: testFleetPolicyID },
          mws: [mwObject],
        })
      );
    });

    it('added mw to  previously added integration', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newBrowserMonitorId + '-' + loc.id + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          params,
          isBrowser: true,
          location: { id: testFleetPolicyID },
          mws: [mwObject],
        })
      );
    });
  });
}
