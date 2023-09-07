/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  HTTPFields,
  MonitorFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { omitTimestamps, omitTimestampsAndSecrets } from './helper/monitor';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('EditMonitor', function () {
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

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body as EncryptedSyntheticsSavedMonitor;
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      _httpMonitorJson = getFixtureJson('http_monitor');
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(() => {
      httpMonitorJson = { ..._httpMonitorJson };
    });

    it('edits the monitor', async () => {
      const newMonitor = httpMonitorJson;

      const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];

      const { created_at: createdAt, updated_at: updatedAt } = savedMonitor;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omitTimestamps(savedMonitor)).eql(
        omitTimestampsAndSecrets({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_ID]: monitorId,
        })
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
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(omitTimestamps(editResponse.body)).eql(
        omitTimestampsAndSecrets({
          ...modifiedMonitor,
          revision: 2,
        })
      );
    });

    it('strips unknown keys from monitor edits', async () => {
      const newMonitor = httpMonitorJson;

      const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];

      const { created_at: createdAt, updated_at: updatedAt } = savedMonitor;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omitTimestamps(savedMonitor)).eql(
        omitTimestampsAndSecrets({
          ...newMonitor,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_ID]: monitorId,
        })
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
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(omitTimestamps(editResponse.body)).eql(
        omitTimestampsAndSecrets({
          ...savedMonitor,
          ...modifiedMonitor,
          revision: 2,
        })
      );
      expect(editResponse.body).not.to.have.keys('unknownkey');
    });

    it('returns 404 if monitor id is not present', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const editResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(404);

      expect(editResponse.body.message).eql(expected404Message);
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      const { id: monitorId, ...savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      // Delete a required property to make payload invalid
      const toUpdate = { ...savedMonitor, 'check.request.headers': null };

      const apiResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const { id: monitorId, ...savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      const toUpdate = { ...savedMonitor, type: 'invalid-data-steam' };

      const apiResponse = await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
      expect(apiResponse.body.message).eql('Monitor type is invalid');
    });

    it('sets config hash to empty string on edits', async () => {
      const newMonitor = httpMonitorJson;
      const configHash = 'djrhefje';

      const savedMonitor = await saveMonitor({
        ...(newMonitor as MonitorFields),
        [ConfigKey.CONFIG_HASH]: configHash,
      });
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];
      const { created_at: createdAt, updated_at: updatedAt } = savedMonitor;
      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      expect(omitTimestamps(savedMonitor)).eql(
        omitTimestampsAndSecrets({
          ...newMonitor,
          [ConfigKey.CONFIG_ID]: monitorId,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_HASH]: configHash,
        })
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
        .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(omitTimestamps(editResponse.body)).eql(
        omitTimestampsAndSecrets({
          ...modifiedMonitor,
          [ConfigKey.CONFIG_ID]: monitorId,
          [ConfigKey.MONITOR_QUERY_ID]: monitorId,
          [ConfigKey.CONFIG_HASH]: '',
          revision: 2,
        })
      );
      expect(editResponse.body).not.to.have.keys('unknownkey');
    });

    it.skip('handles private location errors and does not update the monitor if integration policy is unable to be updated', async () => {
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
          { id: testPolicyId, label: 'Private location', isServiceManaged: false },
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
        const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
        monitorId = savedMonitor[ConfigKey.CONFIG_ID];
        const toUpdate = {
          ...savedMonitor,
          name: '!@#$%^&*()_++[\\-\\]- wow',
          urls: 'https://google.com',
        };
        await supertestWithoutAuth
          .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(toUpdate)
          .expect(500);

        const response = await monitorTestService.getMonitor(monitorId);

        // ensure monitor was not updated
        expect(response.body.urls).not.eql(toUpdate.urls);
        expect(response.body.urls).eql(newMonitor.urls);
        expect(response.body.locations).eql(newMonitor.locations);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertest
          .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
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

      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      const response = await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set('kbn-xsrf', 'true')
        .send(newMonitor)
        .expect(200);

      const savedMonitor = response.body;
      const monitorId = savedMonitor[ConfigKey.CONFIG_ID];
      const toUpdate = {
        ...savedMonitor,
        urls: 'https://google.com',
      };
      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
        .set('kbn-xsrf', 'true')
        .send(toUpdate)
        .expect(200);

      const updatedResponse = await monitorTestService.getMonitor(monitorId, true, SPACE_ID);

      // ensure monitor was updated
      expect(updatedResponse.body.urls).eql(toUpdate.urls);

      // update a second time, ensures AAD was not corrupted
      const toUpdate2 = {
        ...savedMonitor,
        urls: 'https://google.com',
      };

      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
        .set('kbn-xsrf', 'true')
        .send(toUpdate2)
        .expect(200);

      const updatedResponse2 = await monitorTestService.getMonitor(monitorId, true, SPACE_ID);

      // ensure monitor was updated
      expect(updatedResponse2.body.urls).eql(toUpdate2.urls);
    });
  });
}
