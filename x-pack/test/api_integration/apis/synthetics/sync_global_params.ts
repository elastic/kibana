/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ConfigKey,
  HTTPFields,
  SyntheticsParam,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { omit } from 'lodash';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SavedObject } from '@kbn/core-saved-objects-server';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { getTestBrowserSyntheticsPolicy } from './sample_data/test_browser_policy';
import { comparePolicies } from './sample_data/test_policy';

export default function ({ getService }: FtrProviderContext) {
  describe('SyncGlobalParams', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const kServer = getService('kibanaServer');

    let testFleetPolicyID: string;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;
    let newMonitorId: string;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const params: Record<string, string> = {};

    before(async () => {
      await supertestAPI.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertestAPI
        .post('/api/fleet/epm/packages/synthetics/0.11.4')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      _browserMonitorJson = getFixtureJson('browser_monitor');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    beforeEach(() => {
      browserMonitorJson = _browserMonitorJson;
    });

    const testPolicyName = 'Fleet test server policy' + Date.now();

    it('adds a test fleet policy', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = apiResponse.body.item.id;
    });

    it('add a test private location', async () => {
      await testPrivateLocations.setTestLocations([testFleetPolicyID]);

      const apiResponse = await supertestAPI.get(API_URLS.SERVICE_LOCATIONS);

      expect(apiResponse.body.locations).eql([
        {
          id: 'localhost',
          label: 'Local Synthetics Service',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: 'experimental',
          isInvalid: false,
        },
        {
          concurrentMonitors: 1,
          id: testFleetPolicyID,
          isInvalid: false,
          isServiceManaged: false,
          label: 'Test private location 0',
          geo: {
            lat: '',
            lon: '',
          },
          agentPolicyId: testFleetPolicyID,
        },
      ]);
    });

    it('adds a monitor in private location', async () => {
      const newMonitor = browserMonitorJson;

      newMonitor.locations.push({
        id: testFleetPolicyID,
        label: 'Test private location 0',
        isServiceManaged: false,
      });

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.body.attributes).eql(
        omit(
          {
            ...newMonitor,
            [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
            [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          },
          secretKeys
        )
      );
      newMonitorId = apiResponse.body.id;
    });

    it('added an integration for previously added monitor', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestBrowserSyntheticsPolicy({ name: browserMonitorJson.name, id: newMonitorId })
      );
    });

    it('adds a test param', async () => {
      const apiResponse = await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'test' });

      expect(apiResponse.status).eql(200);
    });

    it('get list of params', async () => {
      const apiResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'test' });

      expect(apiResponse.status).eql(200);

      apiResponse.body.data.forEach(({ attributes }: SavedObject<SyntheticsParam>) => {
        params[attributes.key] = attributes.value;
      });
    });

    it('sync global params', async () => {
      const apiResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'test' });

      expect(apiResponse.status).eql(200);
    });

    it('added params to for previously added integration', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestBrowserSyntheticsPolicy({ name: browserMonitorJson.name, id: newMonitorId, params })
      );
    });

    it('delete all params and sync again', async () => {
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
      const apiResponseK = await supertestAPI
        .get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'test' });

      expect(apiResponseK.status).eql(200);

      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestBrowserSyntheticsPolicy({ name: browserMonitorJson.name, id: newMonitorId })
      );
    });
  });
}
