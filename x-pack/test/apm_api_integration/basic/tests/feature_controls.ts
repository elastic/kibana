/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertestAsApmWriteUser');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');
  const es = getService('legacyEs');
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
      method?: 'get' | 'post' | 'delete' | 'put';
      body?: any;
    };
    expectForbidden: (result: any) => void;
    expectResponse: (result: any) => void;
    onExpectationFail?: () => Promise<any>;
  }
  const endpoints: Endpoint[] = [
    {
      // this doubles as a smoke test for the _debug query parameter
      req: {
        url: `/api/apm/services/foo/errors?start=${start}&end=${end}&uiFilters=%7B%7D&_debug=true`,
      },
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
        body: { service: { name: 'test-service' }, etag: 'abc' },
      },
      expectForbidden: expect404,
      expectResponse: expect200,
      onExpectationFail: async () => {
        const res = await es.search({
          index: '.apm-agent-configuration',
        });

        log.error(JSON.stringify(res, null, 2));
      },
    },
    {
      req: {
        url: `/api/apm/settings/custom_links`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
    {
      req: {
        url: `/api/apm/settings/custom_links/transaction`,
      },
      expectForbidden: expect404,
      expectResponse: expect200,
    },
  ];

  const elasticsearchPrivileges = {
    indices: [
      { names: ['apm-*'], privileges: ['read', 'view_index_metadata'] },
      { names: ['.apm-agent-configuration'], privileges: ['read', 'write', 'view_index_metadata'] },
      { names: ['.apm-custom-link'], privileges: ['read', 'write', 'view_index_metadata'] },
    ],
  };

  async function executeAsUser(
    { method = 'get', url, body }: Endpoint['req'],
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    let request = supertestWithoutAuth[method](`${basePath}${url}`);

    // json body
    if (body) {
      request = request.send(body);
    }

    return await request
      .auth(username, password)
      .set('kbn-xsrf', 'foo')
      .then((response: any) => ({ error: undefined, response }))
      .catch((error: any) => ({ error, response: undefined }));
  }

  async function executeAsAdmin({ method = 'get', url, body }: Endpoint['req'], spaceId?: string) {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const fullPath = `${basePath}${url}`;
    let request = supertest[method](fullPath);

    // json body
    if (body) {
      request = request.send(body);
    }

    const response = await request.set('kbn-xsrf', 'foo');

    const { status } = response;
    if (status !== 200) {
      throw new Error(`Endpoint: ${method} ${fullPath}
      Status code: ${status}
      Response: ${response.body.message}`);
    }

    return response;
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
      log.info(`Requesting: ${endpoint.req.url}. Expecting: ${expectation}`);
      const result = await executeAsUser(endpoint.req, username, password, spaceId);
      log.info(`Responded: ${endpoint.req.url}`);

      try {
        if (expectation === 'forbidden') {
          endpoint.expectForbidden(result);
        } else {
          endpoint.expectResponse(result);
        }
      } catch (e) {
        if (endpoint.onExpectationFail) {
          await endpoint.onExpectationFail();
        }

        const { statusCode, body, req } = result.response;
        throw new Error(
          `Endpoint: ${req.method} ${req.path}
          Status code: ${statusCode}
          Response: ${body.message}

          ${e.message}`
        );
      }
    }
  }

  describe('apm feature controls', () => {
    const config = {
      service: { name: 'test-service' },
      settings: { transaction_sample_rate: '0.5' },
    };
    before(async () => {
      log.info(`Creating agent configuration`);
      await executeAsAdmin({
        method: 'put',
        url: '/api/apm/settings/agent-configuration',
        body: config,
      });
      log.info(`Agent configuration created`);
    });

    after(async () => {
      log.info('deleting agent configuration');
      await executeAsAdmin({
        method: 'delete',
        url: `/api/apm/settings/agent-configuration`,
        body: {
          service: config.service,
        },
      });
    });

    it(`APIs can't be accessed by logstash_read user`, async () => {
      const username = 'logstash_read';
      const roleName = 'logstash_read';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          elasticsearch: elasticsearchPrivileges,
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
          elasticsearch: elasticsearchPrivileges,
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
          elasticsearch: elasticsearchPrivileges,
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
          elasticsearch: elasticsearchPrivileges,
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
