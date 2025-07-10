/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRoutePaths } from '@kbn/profiling-plugin/common';
import { TopNFunctions } from '@kbn/profiling-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { loadProfilingData, setupProfiling } from '../utils/profiling_data';
import { getBettertest } from '../common/bettertest';

const profilingRoutePaths = getRoutePaths();

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const log = getService('log');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const es = getService('es');

  const start = new Date('2023-03-17T01:00:00.000Z').getTime();
  const end = new Date('2023-03-17T01:05:00.000Z').getTime();

  registry.when('Functions api', { config: 'cloud' }, () => {
    before(async () => {
      await setupProfiling(bettertest, log);
      await loadProfilingData(es, log);
    });

    describe('With data', () => {
      let functions: TopNFunctions;
      before(async () => {
        await setupProfiling(bettertest, log);
        await loadProfilingData(es, log);
        const response = await profilingApiClient.adminUser({
          endpoint: `GET ${profilingRoutePaths.TopNFunctions}`,
          params: {
            query: {
              timeFrom: start,
              timeTo: end,
              kuery: '',
              startIndex: 0,
              endIndex: 5,
            },
          },
        });
        functions = response.body as TopNFunctions;
      });

      it(`returns correct result`, async () => {
        expect(functions.TopN.length).to.equal(5);
        expect(functions.TotalCount).to.equal(3599);
        expect(functions.selfCPU).to.equal(397);
        expect(functions.totalCPU).to.equal(399);
        expectSnapshot(functions).toMatch();
      });
    });
  });
}
