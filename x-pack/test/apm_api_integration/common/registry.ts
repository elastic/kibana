/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { castArray, groupBy } from 'lodash';
import callsites from 'callsites';
import { maybe } from '@kbn/apm-plugin/common/utils/maybe';
import { joinByKey } from '@kbn/apm-plugin/common/utils/join_by_key';
import { APMFtrConfigName } from '../configs';
import { FtrProviderContext } from './ftr_provider_context';

type ArchiveName =
  | 'apm_8.0.0'
  | 'apm_mappings_only_8.0.0'
  | '8.0.0'
  | 'metrics_8.0.0'
  | 'ml_8.0.0'
  | 'observability_overview'
  | 'rum_8.0.0'
  | 'rum_test_data';

interface RunCondition {
  config: APMFtrConfigName;
  archives: ArchiveName[];
}

export function RegistryProvider({ getService }: FtrProviderContext) {
  const apmFtrConfig = getService('apmFtrConfig');

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

      const esArchiver = getService('esArchiver');
      const logger = getService('log');

      const supertest = getService('legacySupertestAsApmWriteUser');

      const logWithTimer = () => {
        const start = process.hrtime();

        return (message: string) => {
          const diff = process.hrtime(start);
          const time = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
          logger.info(`(${time}) ${message}`);
        };
      };

      const groups = joinByKey(callbacks, ['config', 'archives'], (a, b) => ({
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
        (config === apmFtrConfig.name ? describe : describe.skip)(config, () => {
          groupsForConfig.forEach((group) => {
            const { runs, ...condition } = group;

            const runBefore = async () => {
              const log = logWithTimer();
              for (const archiveName of condition.archives) {
                log(`Loading ${archiveName}`);

                await esArchiver.load(
                  Path.join(
                    'x-pack/test/apm_api_integration/common/fixtures/es_archiver',
                    archiveName
                  )
                );

                // sync jobs from .ml-config to .kibana SOs
                await supertest.get('/api/ml/saved_objects/sync').set('kbn-xsrf', 'foo');
              }
              if (condition.archives.length) {
                log('Loaded all archives');
              }
            };

            const runAfter = async () => {
              const log = logWithTimer();
              for (const archiveName of condition.archives) {
                log(`Unloading ${archiveName}`);
                await esArchiver.unload(
                  Path.join(
                    'x-pack/test/apm_api_integration/common/fixtures/es_archiver',
                    archiveName
                  )
                );
              }
              if (condition.archives.length) {
                log('Unloaded all archives');
              }
            };

            describe(condition.archives.join(',') || 'no data', () => {
              before(runBefore);

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
