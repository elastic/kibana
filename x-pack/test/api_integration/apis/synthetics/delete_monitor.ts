/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import {
  EncryptedSyntheticsSavedMonitor,
  HTTPFields,
  MonitorFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('DeleteMonitorRoute', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let testPolicyId = '';

    const saveMonitor = async (
      monitor: MonitorFields
    ): Promise<EncryptedSyntheticsSavedMonitor> => {
      const res = await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body;
    };

    before(async () => {
      _httpMonitorJson = getFixtureJson('http_monitor');
      await testPrivateLocations.installSyntheticsPackage();

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('deletes monitor by id', async () => {
      const { id: monitorId } = await saveMonitor(httpMonitorJson as MonitorFields);

      const deleteResponse = await supertest
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.body).eql(monitorId);

      // Hit get endpoint and expect 404 as well
      await supertest.get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId).expect(404);
    });

    it('returns 404 if monitor id is not found', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const deleteResponse = await supertest
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.status).eql(404);
      expect(deleteResponse.body.message).eql(expected404Message);
    });

    it('validates empty monitor id', async () => {
      const emptyMonitorId = '';

      // Route DELETE '/${SYNTHETICS_MONITORS}' should not exist
      await supertest
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + emptyMonitorId)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it('validates param length', async () => {
      const veryLargeMonId = new Array(1050).fill('1').join('');

      await supertest
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + veryLargeMonId)
        .set('kbn-xsrf', 'true')
        .expect(400);
    });

    it.skip('handles private location errors and does not delete the monitor if integration policy is unable to be deleted', async () => {
      const name = `Monitor with a private location ${uuidv4()}`;
      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
          {
            id: testPolicyId,
            label: 'Private Europe West',
            isServiceManaged: false,
          },
        ],
      };

      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      let monitorId = '';

      try {
        // use a user without fleet permissions to cause an error
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
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
        const { id } = await saveMonitor(newMonitor as MonitorFields);
        monitorId = id;

        // delete the integration policy to cause an error
        await kibanaServer.savedObjects.clean({ types: [PACKAGE_POLICY_SAVED_OBJECT_TYPE] });

        await supertestWithoutAuth
          .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .expect(500);

        const response = await monitorTestService.getMonitor(monitorId);

        // ensure monitor was not deleted
        expect(response.body.urls).eql(newMonitor.urls);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
      }
    });
  });
}
