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
  describe('SyncMaintenanceWindowsNonDefaultSpace', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const kServer = getService('kibanaServer');

    let testFleetPolicyID: string;
    let loc: PrivateLocation;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;
    let mwObject: any;
    let newBrowserMonitorId: string;
    let spaceId: string;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    before(async () => {
      await kServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();

      _browserMonitorJson = getFixtureJson('browser_monitor');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    beforeEach(() => {
      browserMonitorJson = { ..._browserMonitorJson };
    });

    it('should apply maintenance windows to package policy in non-default space', async () => {
      // Create non-default space
      const spaceData = await monitorTestService.addsNewSpace();
      spaceId = spaceData.SPACE_ID;

      // Create maintenance window in the non-default space
      mwObject = await monitorTestService.createMaintenanceWindow(spaceId);
      mwObject.rRule = mwObject.r_rule;

      // Create private location in the non-default space
      loc = await testPrivateLocations.createPrivateLocation({
        spaceId,
        label: 'Test private location non-default space',
      });
      testFleetPolicyID = loc.agentPolicyId;

      const apiResponse = await supertestAPI.get(
        `/s/${spaceId}${SYNTHETICS_API_URLS.SERVICE_LOCATIONS}`
      );
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
          label: 'Test private location non-default space',
          geo: {
            lat: 0,
            lon: 0,
          },
          agentPolicyId: testFleetPolicyID,
          spaces: [spaceId],
        },
      ];
      expect(apiResponse.body.locations).eql(testLocations);

      // Create monitor in non-default space with maintenance window
      const pvtLoc = {
        id: loc.id,
        agentPolicyId: testFleetPolicyID,
        label: 'Test private location non-default space',
        isServiceManaged: false,
        geo: {
          lat: 0,
          lon: 0,
        },
      };

      const newMonitor = {
        ...browserMonitorJson,
        locations: [LOCAL_LOCATION, pvtLoc],
        maintenance_windows: [mwObject.id],
      };

      const createResponse = await monitorTestService.createMonitor({
        monitor: newMonitor,
        spaceId,
      });

      newBrowserMonitorId = createResponse.rawBody.id;
      expect(createResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: newBrowserMonitorId,
          [ConfigKey.CONFIG_ID]: newBrowserMonitorId,
          locations: [LOCAL_LOCATION, pvtLoc],
          spaces: [spaceId],
        })
      );

      // Verify package policy in non-default space has maintenance window applied
      const packagePolicy = await testPrivateLocations.getPackagePolicy({
        monitorId: newBrowserMonitorId,
        locId: loc.id,
        spaceId,
      });

      expect(packagePolicy?.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: testFleetPolicyID },
          spaceId,
          mws: [mwObject],
        })
      );
    });
  });
}
