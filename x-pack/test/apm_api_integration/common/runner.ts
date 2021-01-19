/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { castArray, once } from 'lodash';
import { joinByKey } from '../../../plugins/apm/common/utils/join_by_key';
import { InheritedFtrProviderContext } from './ftr_provider_context';

type ArchiveName =
  | 'apm_8.0.0'
  | '8.0.0'
  | 'metrics_8.0.0'
  | 'ml_8.0.0'
  | 'observability_overview'
  | 'rum_8.0.0';

interface RunCondition<T extends string> {
  config: T;
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

export const createRunnerProvider = <T extends string>(config: T) => (
  context: InheritedFtrProviderContext
) => {
  const callbacks: Array<
    RunCondition<T> & {
      runs: Array<{
        cb: (beforeFn: (...args: any[]) => any, afterFn: (...args: any[]) => any) => void;
      }>;
    }
  > = [];

  const esArchiver = context.getService('esArchiver');

  const logWithTimer = () => {
    const start = process.hrtime();

    return (message: string) => {
      const diff = process.hrtime(start);
      const time = `${Math.round(diff[0] * 1000 + diff[1] / 1e6)}ms`;
      // eslint-disable-next-line no-console
      console.log(`(${time}) ${message}`);
    };
  };

  return {
    when: (
      title: string,
      conditions: RunCondition<T> | Array<RunCondition<T>>,
      callback: (condition: RunCondition<T>) => void
    ) => {
      const allConditions = castArray(conditions);

      if (!allConditions.length) {
        throw new Error('At least one condition should be defined');
      }

      allConditions
        .filter((condition) => condition.config === config)
        .forEach((matchedCondition) => {
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
    run: onlyOnce(() => {
      const groups = joinByKey(callbacks, 'archives', (a, b) => ({
        ...a,
        ...b,
        runs: a.runs.concat(b.runs),
      }));

      describe('', () => {
        groups.forEach((group) => {
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

          describe('', () => {
            before(runBefore);

            runs.forEach((run) => {
              run.cb(runBefore, runAfter);
            });

            after(runAfter);
          });
        });
      });
    }),
  };
};
