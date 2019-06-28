/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SecurityService, SpacesService } from '../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function featureControlsTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertestWithoutAuth');
  const security: SecurityService = getService('security');
  const spaces: SpacesService = getService('spaces');
  const log = getService('log');

  const start = encodeURIComponent(new Date(Date.now() - 10000).toISOString());
  const end = encodeURIComponent(new Date().toISOString());

  const expect404 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 404);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response).not.to.be(undefined);
    expect(result.response).to.have.property('statusCode', 200);
  };

  const endpoints = [
    {
      url: `/api/apm/services/foo/errors?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/errors/bar?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/errors/distribution?start=${start}&end=${end}&groupId=bar`,
      expectForbidden: expect404,
      expectResponse: (result: any) => {
        expect(result.response).to.have.property('statusCode', 400);
        expect(result.response.body).to.have.property(
          'message',
          "Cannot read property 'distribution' of undefined"
        );
      },
    },
    {
      url: `/api/apm/services/foo/errors/distribution?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: (result: any) => {
        expect(result.response).to.have.property('statusCode', 400);
        expect(result.response.body).to.have.property(
          'message',
          "Cannot read property 'distribution' of undefined"
        );
      },
    },
    {
      url: `/api/apm/services/foo/metrics/charts?start=${start}&end=${end}&agentName=cool-agent`,
      expectForbidden: expect404,
      expectResponse: (result: any) => {
        expect(result.response).to.have.property('statusCode', 400);
        expect(result.response.body).to.have.property(
          'message',
          "Cannot destructure property `timeseriesData` of 'undefined' or 'null'."
        );
      },
    },
    {
      url: `/api/apm/services?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/traces?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/traces/foo?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: (result: any) => {
        expect(result.response).to.have.property('statusCode', 400);
        expect(result.response.body).to.have.property(
          'message',
          "Cannot read property 'transactions' of undefined"
        );
      },
    },
    {
      url: `/api/apm/services/foo/transaction_groups?start=${start}&end=${end}&transactionType=bar`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}&transactionType=bar`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}&transactionType=bar&transactionName=baz`,
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      url: `/api/apm/services/foo/transaction_groups/distribution?start=${start}&end=${end}&transactionType=bar&transactionName=baz`,
      expectForbidden: expect404,
      expectResponse: (result: any) => {
        expect(result.response).to.have.property('statusCode', 400);
        expect(result.response.body).to.have.property(
          'message',
          "Cannot read property 'stats' of undefined"
        );
      },
    },
  ];

  async function executeRequest(
    endpoint: string,
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return await supertest
      .get(`${basePath}${endpoint}`)
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function executeRequests(
    username: string,
    password: string,
    spaceId: string,
    expectation: 'forbidden' | 'response'
  ) {
    for (const endpoint of endpoints) {
      log.debug(`hitting ${endpoint}`);
      const result = await executeRequest(endpoint.url, username, password, spaceId);
      if (expectation === 'forbidden') {
        endpoint.expectForbidden(result);
      } else {
        endpoint.expectResponse(result);
      }
    }
  }

  describe('feature controls', () => {
    it(`APIs can't be accessed by apm-* read privileges role`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['apm-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests(username, password, '', 'forbidden');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('APIs can be accessed global all with apm-* read privileges role', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['apm-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests(username, password, '', 'response');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the APM feature
    it(`APIs can't be accessed by dashboard all with apm-* read privileges role`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['apm-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all'],
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

        await executeRequests(username, password, '', 'forbidden');
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    describe('spaces', () => {
      // the following tests create a user_1 which has uptime read access to space_1 and dashboard all access to space_2
      const space1Id = 'space_1';
      const space2Id = 'space_2';

      const roleName = 'user_1';
      const username = 'user_1';
      const password = 'user_1-password';

      before(async () => {
        await spaces.create({
          id: space1Id,
          name: space1Id,
          disabledFeatures: [],
        });
        await spaces.create({
          id: space2Id,
          name: space2Id,
          disabledFeatures: [],
        });
        await security.role.create(roleName, {
          elasticsearch: {
            indices: [
              {
                names: ['apm-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                apm: ['read'],
              },
              spaces: [space1Id],
            },
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: [space2Id],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
        });
      });

      after(async () => {
        await spaces.delete(space1Id);
        await spaces.delete(space2Id);
        await security.role.delete(roleName);
        await security.user.delete(username);
      });

      it('user_1 can access APIs in space_1', async () => {
        await executeRequests(username, password, space1Id, 'response');
      });

      it(`user_1 can't access APIs in space_2`, async () => {
        await executeRequests(username, password, space2Id, 'forbidden');
      });
    });
  });
}
