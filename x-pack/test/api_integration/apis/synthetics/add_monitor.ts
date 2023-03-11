/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { ConfigKey, DataStream, HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DEFAULT_FIELDS } from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { format as formatUrl } from 'url';

import supertest from 'supertest';
import { serviceApiKeyPrivileges } from '@kbn/synthetics-plugin/server/synthetics_service/get_api_key';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('AddNewMonitors', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    before(() => {
      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('returns the newly added monitor', async () => {
      const newMonitor = httpMonitorJson;

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
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = { ...httpMonitorJson, 'check.request.headers': null };

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.status).eql(400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const newMonitor = { ...httpMonitorJson, type: 'invalid-data-steam' };

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.status).eql(400);
      expect(apiResponse.body.message).eql('Monitor type is invalid');
    });

    it('can create valid monitors without all defaults', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
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
      };

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.status).eql(200);
      expect(apiResponse.body.attributes).eql(
        omit(
          {
            ...DEFAULT_FIELDS[DataStream.HTTP],
            ...newMonitor,
            [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
            [ConfigKey.CONFIG_ID]: apiResponse.body.id,
            revision: 1,
          },
          secretKeys
        )
      );
    });

    it('cannot create a invalid monitor without a monitor type', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        url: 'https://elastic.co',
        locations: [
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
      };

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.status).eql(400);
    });

    it('omits unknown keys', async () => {
      // Delete a required property to make payload invalid
      const newMonitor = {
        name: 'Sample name',
        url: 'https://elastic.co',
        unknownKey: 'unknownValue',
        type: 'http',
        locations: [
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
      };

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor)
        .expect(200);

      const response = await supertestAPI
        .get(`${API_URLS.SYNTHETICS_MONITORS}/${apiResponse.body.id}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(response.body.attributes).not.to.have.keys('unknownkey', 'url');
    });

    it('can create monitor with API key with proper permissions', async () => {
      await supertestAPI
        .post('/internal/security/api_key')
        .set('kbn-xsrf', 'xxx')
        .send({
          name: 'test_api_key',
          expiration: '12d',
          kibana_role_descriptors: {
            uptime_save: {
              elasticsearch: serviceApiKeyPrivileges,
              kibana: [
                {
                  base: [],
                  spaces: [ALL_SPACES_ID],
                  feature: {
                    uptime: ['all'],
                  },
                },
              ],
            },
          },
        })
        .expect(200)
        .then(async (response: Record<string, any>) => {
          const { name, encoded: apiKey } = response.body;
          expect(name).to.eql('test_api_key');

          const config = getService('config');

          const { hostname, protocol, port } = config.get('servers.kibana');
          const kibanaServerUrl = formatUrl({ hostname, protocol, port });
          const supertestNoAuth = supertest(kibanaServerUrl);

          const apiResponse = await supertestNoAuth
            .post(API_URLS.SYNTHETICS_MONITORS)
            .auth(name, apiKey)
            .set('kbn-xsrf', 'true')
            .set('Authorization', `ApiKey ${apiKey}`)
            .send(httpMonitorJson);

          expect(apiResponse.status).eql(200);
        });
    });

    it('can not create monitor with API key without proper permissions', async () => {
      await supertestAPI
        .post('/internal/security/api_key')
        .set('kbn-xsrf', 'xxx')
        .send({
          name: 'test_api_key',
          expiration: '12d',
          kibana_role_descriptors: {
            uptime_save: {
              elasticsearch: serviceApiKeyPrivileges,
              kibana: [
                {
                  base: [],
                  spaces: [ALL_SPACES_ID],
                  feature: {
                    uptime: ['read'],
                  },
                },
              ],
            },
          },
        })
        .expect(200)
        .then(async (response: Record<string, any>) => {
          const { name, encoded: apiKey } = response.body;
          expect(name).to.eql('test_api_key');

          const config = getService('config');

          const { hostname, protocol, port } = config.get('servers.kibana');
          const kibanaServerUrl = formatUrl({ hostname, protocol, port });
          const supertestNoAuth = supertest(kibanaServerUrl);

          const apiResponse = await supertestNoAuth
            .post(API_URLS.SYNTHETICS_MONITORS)
            .auth(name, apiKey)
            .set('kbn-xsrf', 'true')
            .set('Authorization', `ApiKey ${apiKey}`)
            .send(httpMonitorJson);

          expect(apiResponse.status).eql(403);
          expect(apiResponse.body.message).eql('Unable to create synthetics-monitor');
        });
    });

    it('handles private location errors and immediately deletes monitor if integration policy is unable to be saved', async () => {
      const name = `Monitor with private location ${uuidv4()}`;
      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
          {
            id: 'policy-id',
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
        await supertestWithoutAuth
          .post(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(newMonitor)
          .expect(500);

        const response = await supertestAPI
          .get(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.name: "${name}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(response.body.total).eql(0);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('sets namespace to Kibana space when not set to a custom namespace', async () => {
      const username = 'admin';
      const password = `${username}-password`;
      const roleName = 'uptime-role';
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const EXPECTED_NAMESPACE = formatKibanaNamespace(SPACE_ID);
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
      };
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
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
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body.attributes[ConfigKey.NAMESPACE]).eql(EXPECTED_NAMESPACE);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertestAPI
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });

    it('preserves the passed namespace when preserve_namespace is passed', async () => {
      const username = 'admin';
      const password = `${username}-password`;
      const roleName = 'uptime-role';
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const monitor = {
        ...httpMonitorJson,
        [ConfigKey.NAMESPACE]: 'default',
      };
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
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
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({ preserve_namespace: true })
          .set('kbn-xsrf', 'true')
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body.attributes[ConfigKey.NAMESPACE]).eql('default');
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertestAPI
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });

    it('sets namespace to custom namespace when set', async () => {
      const username = 'admin';
      const password = `${username}-password`;
      const roleName = 'uptime-role';
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const monitor = httpMonitorJson;
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
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
        const apiResponse = await supertestWithoutAuth
          .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(monitor)
          .expect(200);
        monitorId = apiResponse.body.id;
        expect(apiResponse.body.attributes[ConfigKey.NAMESPACE]).eql(monitor[ConfigKey.NAMESPACE]);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertestAPI
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorId}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });
  });
}
