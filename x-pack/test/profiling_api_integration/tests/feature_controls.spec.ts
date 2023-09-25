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
import { setupProfiling } from '../utils/profiling_data';
import { getBettertest } from '../common/bettertest';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const log = getService('log');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const start = encodeURIComponent(new Date(Date.now() - 10000).valueOf());
  const end = encodeURIComponent(new Date().valueOf());

  const expect403 = (status: number) => {
    expect(status).to.be(403);
  };

  const expect200 = (status: number) => {
    expect(status).to.be(200);
  };

  interface Endpoint {
    url: string;
    method?: 'GET' | 'POST';
    params?: { query: Record<string, any> };
    body?: any;
  }

  const endpoints: Endpoint[] = [
    {
      url: profilingRoutePaths.TopNContainers,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    {
      url: profilingRoutePaths.TopNDeployments,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    {
      url: profilingRoutePaths.TopNHosts,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    {
      url: profilingRoutePaths.TopNTraces,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    {
      url: profilingRoutePaths.TopNThreads,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    {
      url: profilingRoutePaths.TopNFunctions,
      params: { query: { timeFrom: start, timeTo: end, kuery: '', startIndex: 1, endIndex: 5 } },
    },
    {
      url: profilingRoutePaths.Flamechart,
      params: { query: { timeFrom: start, timeTo: end, kuery: '' } },
    },
    { url: profilingRoutePaths.SetupDataCollectionInstructions },
  ];

  async function executeRequests({
    expectation,
    runAsUser,
  }: {
    expectation: 'forbidden' | 'response';
    runAsUser: Awaited<ReturnType<typeof getProfilingApiClient>>;
  }) {
    for (const endpoint of endpoints) {
      const method = endpoint.method || 'GET';
      const endpointPath = `${method} ${endpoint.url}`;
      try {
        log.info(`Requesting: ${endpointPath}. Expecting: ${expectation}`);
        const result = await runAsUser({
          endpoint: endpointPath,
          params: endpoint.params || {},
        });

        if (expectation === 'forbidden') {
          throw new Error(
            `Endpoint: ${endpointPath}
            Status code: ${result.status}
              Response: ${result.body}`
          );
        }

        expect200(result.status);
      } catch (e) {
        if (e instanceof ProfilingApiError && expectation === 'forbidden') {
          expect403(e.res.status);
        } else {
          throw new Error(
            `Endpoint: ${endpointPath}
              Status code: ${e.res.status}
              Response: ${e.res}
    
              ${e.message}`
          );
        }
      }
    }
  }

  registry.when('Profiling feature controls', { config: 'cloud' }, () => {
    before(async () => {
      await setupProfiling(bettertest, log);
    });
    it(`returns forbidden for users with no access to profiling APIs`, async () => {
      await executeRequests({
        runAsUser: profilingApiClient.noAccessUser,
        expectation: 'forbidden',
      });
    });

    it(`returns ok for users with access to profiling APIs`, async () => {
      await executeRequests({ runAsUser: profilingApiClient.readUser, expectation: 'response' });
    });
  });
}
