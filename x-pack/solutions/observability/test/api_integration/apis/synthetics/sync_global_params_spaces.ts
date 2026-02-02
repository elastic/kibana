/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  HTTPFields,
  PrivateLocation,
  SyntheticsParams,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { ConfigKey } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { omitMonitorKeys } from './add_monitor';

export default function ({ getService }: FtrProviderContext) {
  describe('SyncGlobalParamsSpaces', function () {
    this.tags('skipCloud');
    const supertestAPI = getService('supertest');
    const retry = getService('retry');

    const kServer = getService('kibanaServer');
    let locWithSpace: PrivateLocation;
    let loc2WithSpace: PrivateLocation;
    let _browserMonitorJson: HTTPFields;
    let browserMonitorJson: HTTPFields;
    let newBrowserMonitorId: string;
    let spaceId = '';

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    const params: Record<string, string> = {};

    before(async () => {
      await testPrivateLocations.cleanupFleetPolicies();
      await kServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();
      _browserMonitorJson = getFixtureJson('browser_monitor');
    });

    beforeEach(() => {
      browserMonitorJson = _browserMonitorJson;
    });

    it('create test private locations', async () => {
      const data = await monitorTestService.addsNewSpace();
      spaceId = data.SPACE_ID;
      locWithSpace = await testPrivateLocations.createPrivateLocation({
        spaceId,
        label: 'Test private location 1',
      });
      loc2WithSpace = await testPrivateLocations.createPrivateLocation({
        label: 'Test private location 2',
      });
    });

    it('create monitors in private locations', async () => {
      const newMonitor = browserMonitorJson;
      newMonitor.locations = [locWithSpace];
      newMonitor.spaces = [spaceId, 'default'];

      const res = await monitorTestService.createMonitor({
        monitor: newMonitor,
        spaceId,
      });

      expect(res.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: res.body.id,
          [ConfigKey.CONFIG_ID]: res.body.id,
          spaces: [spaceId, 'default'],
        })
      );
      newBrowserMonitorId = res.rawBody.id;
    });

    it('create monitor in private locations 2', async () => {
      const newMonitor = browserMonitorJson;
      newMonitor.locations = [loc2WithSpace];
      newMonitor.spaces = ['default'];
      newMonitor.name = 'Test HTTP Monitor 03 01';

      const res = await monitorTestService.createMonitor({
        monitor: newMonitor,
      });

      expect(res.body).eql(
        omitMonitorKeys({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: res.body.id,
          [ConfigKey.CONFIG_ID]: res.body.id,
          spaces: ['default'],
          locations: [omit(loc2WithSpace, 'spaces')],
        })
      );
    });

    it('added an integration for previously added monitor', async () => {
      const packagePolicy = await testPrivateLocations.getPackagePolicy({
        spaceId,
        monitorId: newBrowserMonitorId,
        locId: locWithSpace.id,
      });

      expect(packagePolicy?.policy_id).eql(locWithSpace.agentPolicyId);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: locWithSpace.agentPolicyId },
        })
      );
    });

    it('add few test params', async () => {
      await supertestAPI
        .post(`/s/${spaceId}` + SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send([
          { key: 'test', value: 'http://proxy.com' },
          { key: 'username', value: 'elastic' },
        ])
        .expect(200);
    });

    it('get list of params', async () => {
      const apiResponse = await supertestAPI
        .get(`/s/${spaceId}` + SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send();

      expect(apiResponse.status).eql(200);

      apiResponse.body.forEach(({ key, value }: SyntheticsParams) => {
        params[key] = value;
      });
    });

    it('added params to for previously added integration', async () => {
      let packagePolicy;
      await retry.try(async () => {
        packagePolicy = await testPrivateLocations.getPackagePolicy({
          monitorId: newBrowserMonitorId,
          locId: locWithSpace.id,
          spaceId,
        });
        const enabledInput = packagePolicy.inputs.find(
          (input: { enabled: boolean }) => input.enabled === true
        );

        expect(packagePolicy.policy_id).eql(locWithSpace.agentPolicyId);
        expect(enabledInput.streams[0].compiled_stream.params).eql(params);
      });

      comparePolicies(
        packagePolicy!,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: locWithSpace.agentPolicyId },
        })
      );
    });

    it('delete all params and sync again', async () => {
      const getResponse = await supertestAPI
        .get(`/s/${spaceId}` + SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);
      expect(getResponse.body.length).eql(2);

      const paramsResponse = getResponse.body || [];
      const ids = paramsResponse.map((param: any) => param.id);

      const deleteResponse = await supertestAPI
        .delete(`/s/${spaceId}` + SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .send({ ids });

      expect(deleteResponse.status).eql(200);
      expect(deleteResponse.body).to.have.length(2);

      const getResponseAfterDelete = await supertestAPI
        .get(`/s/${spaceId}` + SYNTHETICS_API_URLS.PARAMS)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(getResponseAfterDelete.body.length).eql(0);

      const packagePolicy = await testPrivateLocations.getPackagePolicy({
        monitorId: newBrowserMonitorId,
        locId: locWithSpace.id,
        spaceId,
      });

      expect(packagePolicy.policy_id).eql(locWithSpace.agentPolicyId);

      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: locWithSpace.id },
        })
      );
    });

    it('check browser monitor again after deleting params', async () => {
      let packagePolicy;
      await retry.try(async () => {
        packagePolicy = await testPrivateLocations.getPackagePolicy({
          monitorId: newBrowserMonitorId,
          locId: locWithSpace.id,
          spaceId,
        });
        const enabledInput = packagePolicy.inputs.find(
          (input: { enabled: boolean }) => input.enabled === true
        );
        expect(packagePolicy.policy_id).eql(locWithSpace.agentPolicyId);
        expect(enabledInput.streams[0].compiled_stream.params).eql(undefined);
      });

      comparePolicies(
        packagePolicy!,
        getTestSyntheticsPolicy({
          name: browserMonitorJson.name,
          id: newBrowserMonitorId,
          isBrowser: true,
          location: { id: locWithSpace.id },
        })
      );
    });

    it('number of package policies matches number of monitors', async () => {
      const packagePolicies = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const monitors = await supertestAPI.get(
        '/api/synthetics/monitors?page=1&perPage=2000&showFromAllSpaces=true'
      );
      expect(packagePolicies.body.total).eql(monitors.body.total);
    });
  });
}
