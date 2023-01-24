/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import { SimpleSavedObject } from '@kbn/core/public';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { ConfigKey, HTTPFields, MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('EditMonitor', function () {
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

      return res.body as SimpleSavedObject<MonitorFields>;
    };

    before(async () => {
      _httpMonitorJson = getFixtureJson('http_monitor');
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    beforeEach(() => {
      httpMonitorJson = { ..._httpMonitorJson };
    });

    it('edits the monitor', async () => {
      const newMonitor = httpMonitorJson;

      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        newMonitor as MonitorFields
      );

      expect(savedMonitor).eql(
        omit(
          {
            ...newMonitor,
            [ConfigKey.MONITOR_QUERY_ID]: monitorId,
            [ConfigKey.CONFIG_ID]: monitorId,
          },
          secretKeys
        )
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        [ConfigKey.NAME]: 'Modified name',
        [ConfigKey.LOCATIONS]: [
          {
            id: 'eu-west-01',
            label: 'Europe West',
            geo: {
              lat: 33.2343132435,
              lon: 73.2342343434,
            },
            url: 'https://example-url.com',
            isServiceManaged: true,
          },
        ],
        [ConfigKey.REQUEST_HEADERS_CHECK]: {
          sampleHeader2: 'sampleValue2',
        },
        [ConfigKey.METADATA]: {
          script_source: {
            is_generated_script: false,
            file_name: 'test-file.name',
          },
        },
      };

      const modifiedMonitor = {
        ...savedMonitor,
        ...updates,
        [ConfigKey.METADATA]: {
          ...newMonitor[ConfigKey.METADATA],
          ...updates[ConfigKey.METADATA],
        },
      };

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(editResponse.body.attributes).eql(
        omit({ ...modifiedMonitor, revision: 2 }, secretKeys)
      );
    });

    it('strips unknown keys from monitor edits', async () => {
      const newMonitor = httpMonitorJson;

      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        newMonitor as MonitorFields
      );

      expect(savedMonitor).eql(
        omit(
          {
            ...newMonitor,
            [ConfigKey.MONITOR_QUERY_ID]: monitorId,
            [ConfigKey.CONFIG_ID]: monitorId,
          },
          secretKeys
        )
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        [ConfigKey.NAME]: 'Modified name',
        [ConfigKey.LOCATIONS]: [
          {
            id: 'eu-west-01',
            label: 'Europe West',
            geo: {
              lat: 33.2343132435,
              lon: 73.2342343434,
            },
            url: 'https://example-url.com',
            isServiceManaged: true,
          },
        ],
        [ConfigKey.REQUEST_HEADERS_CHECK]: {
          sampleHeader2: 'sampleValue2',
        },
        [ConfigKey.METADATA]: {
          script_source: {
            is_generated_script: false,
            file_name: 'test-file.name',
          },
        },
        unknownkey: 'unknownvalue',
      } as Partial<HTTPFields>;

      const modifiedMonitor = omit(
        {
          ...updates,
          [ConfigKey.METADATA]: {
            ...newMonitor[ConfigKey.METADATA],
            ...updates[ConfigKey.METADATA],
          },
        },
        ['unknownkey']
      );

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(editResponse.body.attributes).eql(
        omit(
          {
            ...savedMonitor,
            ...modifiedMonitor,
            revision: 2,
          },
          secretKeys
        )
      );
      expect(editResponse.body.attributes).not.to.have.keys('unknownkey');
    });

    it('returns 404 if monitor id is not present', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(404);

      expect(editResponse.body.message).eql(expected404Message);
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      // Delete a required property to make payload invalid
      const toUpdate = { ...savedMonitor, 'check.request.headers': null };

      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      const toUpdate = { ...savedMonitor, type: 'invalid-data-steam' };

      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
      expect(apiResponse.body.message).eql('Monitor type is invalid');
    });

    it('sets config hash to empty string on edits', async () => {
      const newMonitor = httpMonitorJson;
      const configHash = 'djrhefje';

      const { id: monitorId, attributes: savedMonitor } = await saveMonitor({
        ...(newMonitor as MonitorFields),
        [ConfigKey.CONFIG_HASH]: configHash,
      });

      expect(savedMonitor).eql(
        omit(
          {
            ...newMonitor,
            [ConfigKey.CONFIG_ID]: monitorId,
            [ConfigKey.MONITOR_QUERY_ID]: monitorId,
            [ConfigKey.CONFIG_HASH]: configHash,
          },
          secretKeys
        )
      );

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
      } as Partial<HTTPFields>;

      const modifiedMonitor = {
        ...newMonitor,
        ...updates,
        [ConfigKey.METADATA]: {
          ...newMonitor[ConfigKey.METADATA],
          ...updates[ConfigKey.METADATA],
        },
      };

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(editResponse.body.attributes).eql(
        omit(
          {
            ...modifiedMonitor,
            [ConfigKey.CONFIG_ID]: monitorId,
            [ConfigKey.MONITOR_QUERY_ID]: monitorId,
            [ConfigKey.CONFIG_HASH]: '',
            revision: 2,
          },
          secretKeys
        )
      );
      expect(editResponse.body.attributes).not.to.have.keys('unknownkey');
    });

    it('handles private location errors and does not update the monitor if integration policy is unable to be updated', async () => {
      const name = 'Monitor with private location';
      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
          {
            id: 'us_central',
            label: 'Europe West',
            isServiceManaged: true,
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
        const { id, attributes: savedMonitor } = await saveMonitor(newMonitor as MonitorFields);
        monitorId = id;
        const toUpdate = {
          ...savedMonitor,
          locations: [
            ...savedMonitor.locations,
            { id: testPolicyId, label: 'Private location', isServiceManaged: false },
          ],
          urls: 'https://google.com',
        };
        await supertestWithoutAuth
          .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(toUpdate)
          .expect(500);

        const response = await supertest
          .get(`${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // ensure monitor was not updated
        expect(response.body.attributes.urls).eql(newMonitor.urls);
        expect(response.body.attributes.locations).eql(newMonitor.locations);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertest
          .delete(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });

    it('handles spaces', async () => {
      const name = 'Monitor with private location';
      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
          {
            id: 'us_central_west',
            label: 'Europe West',
            isServiceManaged: true,
          },
        ],
      };

      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        const response = await supertest
          .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .set('kbn-xsrf', 'true')
          .send(newMonitor)
          .expect(200);

        const { id, attributes: savedMonitor } = response.body;
        monitorId = id;
        const toUpdate = {
          ...savedMonitor,
          urls: 'https://google.com',
        };
        await supertest
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .send(toUpdate)
          .expect(200);

        const updatedResponse = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // ensure monitor was updated
        expect(updatedResponse.body.attributes.urls).eql(toUpdate.urls);

        // update a second time, ensures AAD was not corrupted
        const toUpdate2 = {
          ...savedMonitor,
          urls: 'https://google.com',
        };

        await supertest
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .send(toUpdate2)
          .expect(200);

        const updatedResponse2 = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);

        // ensure monitor was updated
        expect(updatedResponse2.body.attributes.urls).eql(toUpdate2.urls);
      } finally {
        await supertest
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });
  });
}
