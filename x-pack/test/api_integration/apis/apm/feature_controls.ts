/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SecurityService, SpacesService } from '../../../common/services';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const security: SecurityService = getService('security');
  const spaces: SpacesService = getService('spaces');
  const log = getService('log');

  const start = encodeURIComponent(new Date(Date.now() - 10000).toISOString());
  const end = encodeURIComponent(new Date().toISOString());

  const expect404 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(404);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(200);
  };

  interface Endpoint {
    req: {
      url: string;
      method?: 'get' | 'post';
      body?: any;
    };
    expectForbidden: (result: any) => void;
    expectResponse: (result: any) => void;
  }
  const endpoints: Endpoint[] = [
    {
      req: { url: `/api/apm/services/foo/errors?start=${start}&end=${end}&uiFilters=%7B%7D` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/services/foo/errors/bar?start=${start}&end=${end}&uiFilters=%7B%7D` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/errors/distribution?start=${start}&end=${end}&groupId=bar&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/errors/distribution?start=${start}&end=${end}&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/metrics/charts?start=${start}&end=${end}&agentName=cool-agent&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/services?start=${start}&end=${end}&uiFilters=%7B%7D` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/services/foo/agent_name?start=${start}&end=${end}` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/services/foo/transaction_types?start=${start}&end=${end}` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/traces?start=${start}&end=${end}&uiFilters=%7B%7D` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: { url: `/api/apm/traces/foo?start=${start}&end=${end}` },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/transaction_groups?start=${start}&end=${end}&transactionType=bar&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}&transactionType=bar&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/transaction_groups/charts?start=${start}&end=${end}&transactionType=bar&transactionName=baz&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/services/foo/transaction_groups/distribution?start=${start}&end=${end}&transactionType=bar&transactionName=baz&uiFilters=%7B%7D`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        method: 'post',
        url: `/api/apm/settings/agent-configuration/search`,
        body: { service: { name: 'test-service' } },
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
  ];

  const elasticsearchRole = {
    indices: [
      { names: ['apm-*', '.apm-agent-configuration'], privileges: ['read', 'view_index_metadata'] },
    ],
  };

  async function executeRequest(
    { method = 'get', url, body }: Endpoint['req'],
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    let request = supertest[method](`${basePath}${url}`);

    // send body as json
    if (body) {
      request = request
        .send({
          service: {
            name: 'test-service',
          },
        })
        .set('Content-Type', 'application/json');
    }

    return await request
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function executeRequests({
    username,
    password,
    expectation,
    spaceId,
  }: {
    username: string;
    password: string;
    expectation: 'forbidden' | 'response';
    spaceId?: string;
  }) {
    for (const endpoint of endpoints) {
      log.debug(`hitting ${endpoint.req.url}`);
      const result = await executeRequest(endpoint.req, username, password, spaceId);
      try {
        if (expectation === 'forbidden') {
          endpoint.expectForbidden(result);
        } else {
          endpoint.expectResponse(result);
        }
      } catch (e) {
        const { body, req } = result.response;
        throw new Error(
          `Endpoint: ${req.method} ${req.path}
          Status code: ${body.statusCode}
          Response: ${body.message}

          ${e.message}`
        );
      }
    }
  }

  describe('apm feature controls', () => {
    it(`APIs can't be accessed by logstash_read user`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchRole,
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'forbidden' });
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    it('APIs can be accessed by global_all user', async () => {
      const username = 'global_all';
      const roleName = 'global_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchRole,
          kibana: [{ base: ['all'], spaces: ['*'] }],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'response' });
      } finally {
        await security.role.delete(roleName);
        await security.user.delete(username);
      }
    });

    // this could be any role which doesn't have access to the APM feature
    it(`APIs can't be accessed by dashboard_all user`, async () => {
      const username = 'dashboard_all';
      const roleName = 'dashboard_all';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchRole,
          kibana: [{ feature: { dashboard: ['all'] }, spaces: ['*'] }],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await executeRequests({ username, password, expectation: 'forbidden' });
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
          elasticsearch: elasticsearchRole,
          kibana: [
            { feature: { apm: ['read'] }, spaces: [space1Id] },
            { feature: { dashboard: ['all'] }, spaces: [space2Id] },
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
        await executeRequests({ username, password, expectation: 'response', spaceId: space1Id });
      });

      it(`user_1 can't access APIs in space_2`, async () => {
        await executeRequests({ username, password, expectation: 'forbidden', spaceId: space2Id });
      });
    });
  });
}
