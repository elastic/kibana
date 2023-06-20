/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getRoutePaths } from '@kbn/profiling-plugin/common';
import { ProfilingApiError } from '../common/api_supertest';
import { getProfilingApiClient } from '../common/config';
import { FtrProviderContext } from '../common/ftr_provider_context';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const log = getService('log');

  const start = encodeURIComponent(new Date(Date.now() - 10000).valueOf());
  const end = encodeURIComponent(new Date().valueOf());

  const expect403 = (status: number) => {
    expect(status).to.be(403);
  };

  const expect200 = (status: number) => {
    expect(status).to.be(200);
  };

  interface Endpoint {
    req: {
      url: string;
      method?: 'GET';
      params?: { query: Record<string, any> };
      body?: any;
    };
    expectForbidden: (status: number) => void;
    expectResponse: (status: number) => void;
    onExpectationFail?: () => Promise<any>;
  }

  const endpoints: Endpoint[] = [
    {
      req: {
        method: 'GET',
        url: profilingRoutePaths.Flamechart,
        params: {
          query: { timeFrom: start, timeTo: end, kuery: '' },
        },
      },
      expectForbidden: expect403,
      expectResponse: expect200,
    },
  ];

  async function executeRequests({
    expectation,
    runAsUser,
  }: {
    expectation: 'forbidden' | 'response';
    runAsUser: Awaited<ReturnType<typeof getProfilingApiClient>>;
  }) {
    for (const endpoint of endpoints) {
      try {
        log.info(`Requesting: ${endpoint.req.url}. Expecting: ${expectation}`);
        const result = await runAsUser({
          endpoint: `${endpoint.req.method} ${endpoint.req.url}`,
          params: endpoint.req.params,
        });
        if (expectation === 'forbidden') {
          throw new Error(
            `Endpoint: ${endpoint.req.method} ${endpoint.req.url}
              Status code: ${result.status}
              Response: ${result.body}`
          );
        }

        endpoint.expectResponse(result.status);
      } catch (e) {
        if (e instanceof ProfilingApiError && expectation === 'forbidden') {
          endpoint.expectForbidden(e.res.status);
        } else {
          throw new Error(
            `Endpoint: ${endpoint.req.method} ${endpoint.req.url}
              Status code: ${e.res.status}
              Response: ${e.res}
    
              ${e.message}`
          );
        }
      }
    }
  }

  registry.when('Profiling feature controls', { config: 'cloud', archives: [] }, () => {
    it(`returns forbidden for users with no access to APIs`, async () => {
      await executeRequests({
        runAsUser: profilingApiClient.noAccessUser,
        expectation: 'forbidden',
      });
    });

    it(`returns ok for users with access to APIs`, async () => {
      await executeRequests({ runAsUser: profilingApiClient.readUser, expectation: 'response' });
    });
  });
}
