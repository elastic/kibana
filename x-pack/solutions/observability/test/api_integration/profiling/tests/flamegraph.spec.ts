/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRoutePaths } from '@kbn/profiling-plugin/common';
import { BaseFlameGraph } from '@kbn/profiling-utils';
import { sortBy } from 'lodash';
import { getBettertest } from '../common/bettertest';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { loadProfilingData, setupProfiling } from '../utils/profiling_data';

const profilingRoutePaths = getRoutePaths();
type BaseFlameGraphKeys = keyof BaseFlameGraph;

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const profilingApiClient = getService('profilingApiClient');
  const log = getService('log');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);
  const es = getService('es');

  const start = new Date('2023-03-17T01:00:00.000Z').getTime();
  const end = new Date('2023-03-17T01:00:30.000Z').getTime();

  registry.when('Flamegraph api', { config: 'cloud' }, () => {
    before(async () => {
      await setupProfiling(bettertest, log);
      await loadProfilingData(es, log);
    });

    describe('With data', () => {
      let flamegraph: BaseFlameGraph;
      before(async () => {
        await setupProfiling(bettertest, log);
        await loadProfilingData(es, log);
        const response = await profilingApiClient.adminUser({
          endpoint: `GET ${profilingRoutePaths.Flamechart}`,
          params: {
            query: {
              timeFrom: start,
              timeTo: end,
              kuery: '',
            },
          },
        });
        flamegraph = response.body as BaseFlameGraph;
      });

      (
        [
          'AddressOrLine',
          'FileID',
          'FrameType',
          'Inline',
          'ExeFilename',
          'AddressOrLine',
          'FunctionName',
          'FunctionOffset',
          'SourceFilename',
          'SourceLine',
          'CountInclusive',
          'CountExclusive',
        ] as BaseFlameGraphKeys[]
      ).forEach((item) => {
        it(`returns correct ${item}`, async () => {
          expectSnapshot(sortBy(flamegraph[item] as any[])).toMatch();
        });
      });

      (['SamplingRate', 'Size', 'TotalSeconds'] as BaseFlameGraphKeys[]).forEach((item) => {
        it(`returns correct ${item}`, async () => {
          expectSnapshot(flamegraph[item]).toMatch();
        });
      });
    });
  });
}
