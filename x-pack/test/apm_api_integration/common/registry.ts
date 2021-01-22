/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { castArray, once, groupBy } from 'lodash';
import { joinByKey } from '../../../plugins/apm/common/utils/join_by_key';
import { APMFtrConfigName } from '../configs';
import { FtrProviderContext } from './ftr_provider_context';

type ArchiveName =
  | 'apm_8.0.0'
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

const onlyOnce = <T extends (...args: any[]) => any>(cb: T): T => {
  const called: boolean = false;

  return ((...args: any[]) => {
    if (called) {
      throw new Error('Function can only be called once');
    }
    return cb(...args);
  }) as T;
};

const callbacks: Array<
  RunCondition & {
    runs: Array<{
      cb: (beforeFn: (...args: any[]) => any, afterFn: (...args: any[]) => any) => void;
    }>;
  }
> = [];

let configName: APMFtrConfigName | undefined;

export const registry = {
  init: onlyOnce((config: APMFtrConfigName) => {
    configName = config;
  }),
  when: (
    title: string,
    conditions: RunCondition | RunCondition[],
    callback: (condition: RunCondition) => void
  ) => {
    const allConditions = castArray(conditions);

    if (!allConditions.length) {
      throw new Error('At least one condition should be defined');
    }

    allConditions.forEach((matchedCondition) => {
      callbacks.push({
        ...matchedCondition,
        runs: [
          {
            cb: () => {
              describe(title, () => {
                callback(matchedCondition);
              });
            },
          },
        ],
      });
    });
  },
  run: onlyOnce((context: FtrProviderContext) => {
    if (!configName) {
      throw new Error(`registry was not init() before running`);
    }
    const esArchiver = context.getService('esArchiver');
    const logger = context.getService('log');
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

    const byConfig = groupBy(groups, 'config');

    Object.keys(byConfig).forEach((config) => {
      const groupsForConfig = byConfig[config];
      // register suites for other configs, but skip them so tests are marked as such
      // and their snapshots are not marked as obsolete
      (config === configName ? describe : describe.skip)(config, () => {
        groupsForConfig.forEach((group) => {
          const { runs, ...condition } = group;

          const runBefore = once(async () => {
            const log = logWithTimer();
            for (const archiveName of condition.archives) {
              log(`Loading ${archiveName}`);
              await esArchiver.load(archiveName);
            }
            if (condition.archives.length) {
              log('Loaded all archives');
            }
          });

          const runAfter = once(async () => {
            const log = logWithTimer();
            for (const archiveName of condition.archives) {
              log(`Unloading ${archiveName}`);
              await esArchiver.unload(archiveName);
            }
            if (condition.archives.length) {
              log('Unloaded all archives');
            }
          });

          describe(condition.archives.join(',') || 'no data', () => {
            before(runBefore);

            runs.forEach((run) => {
              run.cb(runBefore, runAfter);
            });

            after(runAfter);
          });
        });
      });
    });
  }),
};
