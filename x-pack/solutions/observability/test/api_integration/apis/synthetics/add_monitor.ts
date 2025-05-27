/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import moment from 'moment/moment';
import { v4 as uuidv4 } from 'uuid';
import { omit, omitBy } from 'lodash';
import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { ALL_SPACES_ID } from '@kbn/security-plugin/common/constants';
import { getServiceApiKeyPrivileges } from '@kbn/synthetics-plugin/server/synthetics_service/get_api_key';
import { legacySyntheticsMonitorTypeSingle } from '@kbn/synthetics-plugin/common/types/saved_objects';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '@kbn/synthetics-plugin/server/routes/monitor_cruds/formatters/saved_object_to_monitor';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export const addMonitorAPIHelper = async (supertestAPI: any, monitor: any, statusCode = 200) => {
  const result = await supertestAPI
    .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
    .set('kbn-xsrf', 'true')
    .send(monitor);

  expect(result.status).eql(statusCode, JSON.stringify(result.body));

  if (statusCode === 200) {
    const { created_at: createdAt, updated_at: updatedAt, id, config_id: configId } = result.body;
    expect(id).not.empty();
    expect(configId).not.empty();
    expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);
    return {
      rawBody: result.body,
      body: {
        ...omit(result.body, ['created_at', 'updated_at', 'id', 'config_id', 'form_monitor_type']),
      },
    };
  }
  return result.body;
};

export const keyToOmitList = [
  'created_at',
  'updated_at',
  'id',
  'config_id',
  'form_monitor_type',
  'spaceId',
];

export const omitMonitorKeys = (monitor: any) => {
  return omitBy(omit(transformPublicKeys(monitor), keyToOmitList), removeMonitorEmptyValues);
};

export default function ({ getService }: FtrProviderContext) {
  describe('AddNewMonitorsUI', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    before(async () => {
      _httpMonitorJson = getFixtureJson('http_monitor');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    it('can create monitor with API key with proper permissions', async () => {
      const response: Record<string, any> = await supertestAPI
        .post('/internal/security/api_key')
        .set('kbn-xsrf', 'xxx')
        .send({
          name: 'test_api_key',
          expiration: '12d',
          kibana_role_descriptors: {
            uptime_save: {
              elasticsearch: getServiceApiKeyPrivileges(false),
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
        .expect(200);

      const { name, encoded: apiKey } = response.body;
      expect(name).to.eql('test_api_key');

      const config = getService('config');

      const { hostname, protocol, port } = config.get('servers.kibana');
      const kibanaServerUrl = formatUrl({ hostname, protocol, port });
      const supertestNoAuth = supertest(kibanaServerUrl);

      const apiResponse = await supertestNoAuth
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .auth(name, apiKey)
        .set('kbn-xsrf', 'true')
        .set('Authorization', `ApiKey ${apiKey}`)
        .send({ ...httpMonitorJson, name: 'monitor with api key' });

      expect(apiResponse.status).eql(200, JSON.stringify(apiResponse.body));
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
              elasticsearch: getServiceApiKeyPrivileges(false),
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
            .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
            .auth(name, apiKey)
            .set('kbn-xsrf', 'true')
            .set('Authorization', `ApiKey ${apiKey}`)
            .send(httpMonitorJson);

          expect(apiResponse.status).eql(403);
          expect(apiResponse.body.message).eql(
            'API [POST /api/synthetics/monitors] is unauthorized for user, this action is granted by the Kibana privileges [uptime-write]'
          );
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
        const res = await supertestWithoutAuth
          .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(newMonitor);
        expect(res.status).to.eql(400);

        expect(res.body.message).to.eql(
          "Invalid locations specified. Private Location(s) 'policy-id' not found. No private location available to use."
        );

        const response = await supertestAPI
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            filter: `${legacySyntheticsMonitorTypeSingle}.attributes.name: "${name}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(response.body.total).eql(0);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });
  });
}
