/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getRoutePaths } from '@kbn/profiling-plugin/common';
import qs from 'query-string';
import { FtrProviderContext } from '../common/ftr_provider_context';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const spaces = getService('spaces');
  const es = getService('es');
  const log = getService('log');

  const start = encodeURIComponent(new Date(Date.now() - 10000).toISOString());
  const end = encodeURIComponent(new Date().toISOString());

  const expect403 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(403);
  };

  const expect200 = (result: any) => {
    expect(result.error).to.be(undefined);
    expect(result.response.statusCode).to.be(200);
  };

  interface Endpoint {
    req: {
      url: string;
      method?: 'get';
      params?: { query: Record<string, any> };
      body?: any;
    };
    expectForbidden: (result: any) => void;
    expectResponse: (result: any) => void;
    onExpectationFail?: () => Promise<any>;
  }

  const endpoints: Endpoint[] = [
    {
      req: {
        url: profilingRoutePaths.Flamechart,
        params: {
          query: { timeFrom: start, timeTo: end, kuery: '' },
        },
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
  ];

  const elasticsearchPrivileges = {
    indices: [{ names: ['profiling*'], privileges: ['read', 'view_index_metadata'] }],
  };

  async function executeAsUser(
    { method = 'get', url, params, body }: Endpoint['req'],
    username: string,
    password: string,
    spaceId?: string
  ) {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const querystring = params?.query ? qs.stringify(params?.query) : '';
    log.info(`Query string: ${querystring}`);
    const endpointPath = `${url}?${querystring}`;
    let request = supertestWithoutAuth[method](`${basePath}${endpointPath}`);

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

  registry.when('Profiling feature controls', { config: 'cloud', archives: [] }, () => {
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
  });
}
