/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ConfigKey,
  HTTPFields,
  LocationStatus,
  PrivateLocation,
  ServiceLocation,
  SyntheticsParams,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { addMonitorAPIHelper, omitMonitorKeys } from './add_monitor';
import { LOCAL_LOCATION } from './get_filters';

export default function ({ getService }: FtrProviderContext) {
  describe('SyncGlobalParams', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const kServer = getService('kibanaServer');

    let testFleetPolicyID: string;
    let loc: any;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    let newMonitorId: string;
    let newHttpMonitorId: string;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const params: Record<string, string> = {};

    const addMonitorAPI = async (monitor: any, statusCode = 200) => {
      return addMonitorAPIHelper(supertestAPI, monitor, statusCode);
    };

    before(async () => {
      await kServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();

      _browserMonitorJson = getFixtureJson('browser_monitor');
      _httpMonitorJson = getFixtureJson('http_monitor');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    beforeEach(() => {
      browserMonitorJson = _browserMonitorJson;
      httpMonitorJson = _httpMonitorJson;
    });

    it('add a test private location', async () => {
      loc = await testPrivateLocations.addPrivateLocation();
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

      const apiResponse = await addMonitorAPI(newMonitor);

      expect(apiResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          locations: [LOCAL_LOCATION, pvtLoc],
        })
      );
      newMonitorId = apiResponse.rawBody.id;
    });

    it('added an integration for previously added monitor', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) => pkgPolicy.id === newMonitorId + '-' + loc.id + '-default'
      );

      expect(packagePolicy?.policy_id).eql(
        testFleetPolicyID,
        JSON.stringify({ testFleetPolicyID, newMonitorId })
      );

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          isBrowser: true,
          location: { id: testFleetPolicyID },
        })
      );
    });

    it('adds a test param', async () => {
      const apiResponse = await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'http://proxy.com' });

      expect(apiResponse.status).eql(200);
    });

    it('get list of params', async () => {
      const apiResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'test', value: 'http://proxy.com' });

      expect(apiResponse.status).eql(200);

      apiResponse.body.forEach(({ key, value }: SyntheticsParams) => {
        params[key] = value;
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
        (pkgPolicy: PackagePolicy) => pkgPolicy.id === newMonitorId + '-' + loc.id + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          params,
          isBrowser: true,
          location: { id: testFleetPolicyID },
        })
      );
    });

    it('add a http monitor using param', async () => {
      const newMonitor = httpMonitorJson;
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

      newMonitor.proxy_url = '${test}';

      const apiResponse = await addMonitorAPI(newMonitor);

      expect(apiResponse.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
          [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          locations: [LOCAL_LOCATION, pvtLoc],
        })
      );
      newHttpMonitorId = apiResponse.rawBody.id;
    });

    it('parsed params for previously added http monitors', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) => pkgPolicy.id === newHttpMonitorId + '-' + loc.id + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      const pPolicy = getTestSyntheticsPolicy({
        name: httpMonitorJson.name,
        id: newHttpMonitorId,
        isTLSEnabled: false,
        namespace: 'testnamespace',
        location: { id: loc.id },
      });

      comparePolicies(packagePolicy, pPolicy);
    });

    it('delete all params and sync again', async () => {
      await supertestAPI
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ key: 'get', value: 'test' });
      const getResponse = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponse.body.length).eql(2);

      const paramsResponse = getResponse.body || [];
      const ids = paramsResponse.map((param: any) => param.id);

      const deleteResponse = await supertestAPI
        .delete(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ ids });

      expect(deleteResponse.status).eql(200);

      expect(deleteResponse.body).to.have.length(2);

      const getResponseAfterDelete = await supertestAPI
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponseAfterDelete.body.length).eql(0);

      await supertestAPI
        .get(SYNTHETICS_API_URLS.SYNC_GLOBAL_PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) => pkgPolicy.id === newMonitorId + '-' + loc.id + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newMonitorId,
          isBrowser: true,
          location: { id: loc.id },
        })
      );
    });
  });
}
