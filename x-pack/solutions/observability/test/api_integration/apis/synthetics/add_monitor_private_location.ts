/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import {
  ConfigKey,
  HTTPFields,
  PrivateLocation,
  ServiceLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { omit } from 'lodash';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import expect from '@kbn/expect';
import { getDevLocation } from '@kbn/synthetics-plugin/server/synthetics_service/get_service_locations';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { comparePolicies, getTestSyntheticsPolicy } from './sample_data/test_policy';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { keyToOmitList, omitMonitorKeys } from './add_monitor';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('PrivateLocationAddMonitor', function () {
    this.tags('skipCloud');
    const kibanaServer = getService('kibanaServer');
    const supertestAPI = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    let testFleetPolicyID: string;
    let pvtLoc: PrivateLocation;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const security = getService('security');

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await testPrivateLocations.installSyntheticsPackage();

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('add a test private location', async () => {
      pvtLoc = await testPrivateLocations.addPrivateLocation();
      testFleetPolicyID = pvtLoc.agentPolicyId;

      const apiResponse = await supertestAPI.get(SYNTHETICS_API_URLS.SERVICE_LOCATIONS);

      const testResponse: Array<PrivateLocation | ServiceLocation> = [
        ...getDevLocation('mockDevUrl'),
        { ...pvtLoc, isInvalid: false },
      ];

      expect(apiResponse.body.locations).eql(testResponse);
    });

    it('handles spaces', async () => {
      const { username, password, SPACE_ID, roleName } = await monitorTestService.addsNewSpace();

      let monitorId = '';
      const monitor = {
        ...httpMonitorJson,
        name: `Test monitor ${uuidv4()}`,
        [ConfigKey.NAMESPACE]: 'default',
        locations: [omit(pvtLoc, ['spaces'])],
      };

      try {
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(monitor);
        expect(apiResponse.status).eql(200, JSON.stringify(apiResponse.body));

        const { created_at: createdAt, updated_at: updatedAt } = apiResponse.body;
        expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

        expect(omit(apiResponse.body, keyToOmitList)).eql(
          omitMonitorKeys({
            ...monitor,
            [ConfigKey.NAMESPACE]: formatKibanaNamespace(SPACE_ID),
            url: apiResponse.body.url,
            spaces: [SPACE_ID],
          })
        );
        monitorId = apiResponse.body.id;

        const policyResponse = await supertestAPI.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = policyResponse.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id === monitorId + '-' + pvtLoc.id + `-${SPACE_ID}`
        );

        expect(packagePolicy.policy_id).eql(testFleetPolicyID);
        expect(packagePolicy.name).eql(`${monitor.name}-Test private location 0-${SPACE_ID}`);
        comparePolicies(
          packagePolicy,
          getTestSyntheticsPolicy({
            name: monitor.name,
            id: monitorId,
            location: { id: pvtLoc.id },
            namespace: formatKibanaNamespace(SPACE_ID),
            spaceId: SPACE_ID,
          })
        );
        await supertestWithoutAuth
          .delete(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ ids: [monitorId] })
          .expect(200);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });
  });
}
