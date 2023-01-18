/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import { v4 as uuid } from 'uuid';
import { ConfigKey, HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { omit } from 'lodash';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('PrivateLocationMonitor', function () {
    this.tags('skipCloud');
    const kibanaServer = getService('kibanaServer');
    const supertestAPI = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    let testFleetPolicyID: string;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const security = getService('security');

    before(async () => {
      await supertestAPI.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertestAPI
        .post('/api/fleet/epm/packages/synthetics/0.11.4')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
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

    let newMonitorId: string;

    it('adds a monitor in private location', async () => {
      const newMonitor = httpMonitorJson;

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

      comparePolicies(packagePolicy, getTestSyntheticsPolicy(httpMonitorJson.name, newMonitorId));
    });

    let testFleetPolicyID2: string;

    it('edits a monitor with additional private location', async () => {
      const resPolicy = await testPrivateLocations.addFleetPolicy(testPolicyName + 1);
      testFleetPolicyID2 = resPolicy.body.item.id;

      await testPrivateLocations.setTestLocations([testFleetPolicyID, testFleetPolicyID2]);

      httpMonitorJson.locations.push({
        id: testFleetPolicyID2,
        label: 'Test private location ' + 1,
        isServiceManaged: false,
      });

      const apiResponse = await supertestAPI
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson);

      expect(apiResponse.body.attributes).eql(
        omit(
          {
            ...httpMonitorJson,
            [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
            [ConfigKey.CONFIG_ID]: apiResponse.body.id,
            revision: 2,
          },
          secretKeys
        )
      );
    });

    it('added an integration for second location in edit monitor', async () => {
      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(packagePolicy, getTestSyntheticsPolicy(httpMonitorJson.name, newMonitorId));

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID2);
      comparePolicies(
        packagePolicy,
        getTestSyntheticsPolicy(httpMonitorJson.name, newMonitorId, 'Test private location 1')
      );
    });

    it('deletes integration for a removed location from monitor', async () => {
      httpMonitorJson.locations = httpMonitorJson.locations.filter(
        ({ id }) => id !== testFleetPolicyID2
      );

      await supertestAPI
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(200);

      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(packagePolicy, getTestSyntheticsPolicy(httpMonitorJson.name, newMonitorId));

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy).eql(undefined);
    });

    it('deletes integration for a deleted monitor', async () => {
      await supertestAPI
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(200);

      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy).eql(undefined);
    });

    it('handles spaces', async () => {
      const username = 'admin';
      const password = `${username}-password`;
      const roleName = 'uptime-role';
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
      let monitorId = '';
      const monitor = {
        ...httpMonitorJson,
        name: `Test monitor ${uuid.v4()}`,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [
          {
            id: testFleetPolicyID,
            label: 'Test private location 0',
            isServiceManaged: false,
          },
        ],
      };

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
                fleet: ['all'],
                fleetv2: ['all'],
                actions: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(monitor)
          .expect(200);

        expect(apiResponse.body.attributes).eql(
          omit(
            {
              ...monitor,
              [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
              [ConfigKey.CONFIG_ID]: apiResponse.body.id,
              [ConfigKey.NAMESPACE]: formatKibanaNamespace(SPACE_ID),
            },
            secretKeys
          )
        );
        monitorId = apiResponse.body.id;

        const policyResponse = await supertestAPI.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + testFleetPolicyID + `-${SPACE_ID}`
        );

        expect(packagePolicy.policy_id).eql(testFleetPolicyID);
        expect(packagePolicy.name).eql(`${monitor.name}-Test private location 0-${SPACE_ID}`);
        comparePolicies(
          packagePolicy,
          getTestSyntheticsPolicy(
            monitor.name,
            monitorId,
            undefined,
            formatKibanaNamespace(SPACE_ID)
          )
        );
        await supertestWithoutAuth
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('handles auto upgrading policies', async () => {
      let monitorId = '';

      const monitor = {
        ...httpMonitorJson,
        name: `Test monitor ${uuid.v4()}`,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [
          {
            id: testFleetPolicyID,
            label: 'Test private location 0',
            isServiceManaged: false,
          },
        ],
      };

      try {
        const apiResponse = await supertestAPI
          .post(API_URLS.SYNTHETICS_MONITORS)
          .set('kbn-xsrf', 'true')
          .send(monitor);

        monitorId = apiResponse.body.id;

        const policyResponse = await supertestAPI.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + testFleetPolicyID + `-default`
        );

        expect(packagePolicy.package.version).eql('0.11.4');

        await supertestAPI.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
        const policyResponseAfterUpgrade = await supertestAPI.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        const packagePolicyAfterUpgrade = policyResponseAfterUpgrade.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + testFleetPolicyID + `-default`
        );
        expect(semver.gte(packagePolicyAfterUpgrade.package.version, '0.11.4')).eql(true);
      } finally {
        await supertestAPI
          .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      }
    });
  });
}
