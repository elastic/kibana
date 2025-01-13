/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinByKey } from '@kbn/apm-plugin/common/utils/join_by_key';
import { maybe } from '@kbn/apm-plugin/common/utils/maybe';
import callsites from 'callsites';
import { castArray, groupBy } from 'lodash';
import { ProfilingFtrConfigName } from '../configs';
import { getBettertest } from './bettertest';
import { FtrProviderContext } from './ftr_provider_context';
import { cleanUpProfilingData } from '../utils/profiling_data';

interface RunCondition {
  config: ProfilingFtrConfigName;
}

export function RegistryProvider({ getService }: FtrProviderContext) {
  const profilingFtrConfig = getService('profilingFtrConfig');
  const supertest = getService('supertest');
  const bettertest = getBettertest(supertest);

  const es = getService('es');

  const callbacks: Array<
    RunCondition & {
      runs: Array<{
        cb: () => void;
      }>;
    }
  > = [];

  let running: boolean = false;

  function when(
    title: string,
    conditions: RunCondition | RunCondition[],
    callback: (condition: RunCondition) => void,
    skip?: boolean
  ) {
    const allConditions = castArray(conditions);

    if (!allConditions.length) {
      throw new Error('At least one condition should be defined');
    }

    if (running) {
      throw new Error("Can't add tests when running");
    }

    const frame = maybe(callsites()[1]);

    const file = frame?.getFileName();

    if (!file) {
      throw new Error('Could not infer file for suite');
    }

    allConditions.forEach((matchedCondition) => {
      callbacks.push({
        ...matchedCondition,
        runs: [
          {
            cb: () => {
              const suite: ReturnType<typeof describe> = (skip ? describe.skip : describe)(
                title,
                () => {
                  callback(matchedCondition);
                }
              ) as any;

              suite.file = file;
              suite.eachTest((test) => {
                test.file = file;
              });
            },
          },
        ],
      });
    });
  }

  when.skip = (
    title: string,
    conditions: RunCondition | RunCondition[],
    callback: (condition: RunCondition) => void
  ) => {
    when(title, conditions, callback, true);
  };

  const registry = {
    when,
    run: () => {
      running = true;

      const logger = getService('log');

      const groups = joinByKey(callbacks, ['config'], (a, b) => ({
        ...a,
        ...b,
        runs: a.runs.concat(b.runs),
      }));

      callbacks.length = 0;

      const byConfig = groupBy(groups, 'config');

      Object.keys(byConfig).forEach((config) => {
        const groupsForConfig = byConfig[config];

        // register suites for other configs, but skip them so tests are marked as such
        // and their snapshots are not marked as obsolete
        (config === profilingFtrConfig.name ? describe : describe.skip)(config, () => {
          groupsForConfig.forEach((group) => {
            const { runs } = group;

            const runAfter = async () => {
              await cleanUpProfilingData({ es, bettertest, logger });
            };

            describe('Loading profiling data', () => {
              runs.forEach((run) => {
                run.cb();
              });

              after(runAfter);
            });
          });
        });
      });

      running = false;
    },
  };

  return registry;
}
