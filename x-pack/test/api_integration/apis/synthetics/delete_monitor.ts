/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { HTTPFields, MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  // Failing: See https://github.com/elastic/kibana/issues/147990
  describe.skip('DeleteMonitorRoute', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;
    let testPolicyId = '';

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body;
    };

    before(async () => {
      _httpMonitorJson = getFixtureJson('http_monitor');
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .post('/api/fleet/epm/packages/synthetics/0.11.4')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

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
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.body).eql(monitorId);

      // Hit get endpoint and expect 404 as well
      await supertest.get(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId).expect(404);
    });

    it('returns 404 if monitor id is not found', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const deleteResponse = await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true');

      expect(deleteResponse.status).eql(404);
      expect(deleteResponse.body.message).eql(expected404Message);
    });

    it('validates empty monitor id', async () => {
      const emptyMonitorId = '';

      // Route DELETE '/${SYNTHETICS_MONITORS}' should not exist
      await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + emptyMonitorId)
        .set('kbn-xsrf', 'true')
        .expect(404);
    });

    it('validates param length', async () => {
      const veryLargeMonId = new Array(1050).fill('1').join('');

      await supertest
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + veryLargeMonId)
        .set('kbn-xsrf', 'true')
        .expect(400);
    });

    it('handles private location errors and does not delete the monitor if integration policy is unable to be deleted', async () => {
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
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

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
        await supertestWithoutAuth
          .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .expect(500);

        const response = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // ensure monitor was not deleted
        expect(response.body.attributes.urls).eql(newMonitor.urls);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });
  });
}
