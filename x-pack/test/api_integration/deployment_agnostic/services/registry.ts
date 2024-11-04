/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import callsites from 'callsites';
import { joinByKey } from '@kbn/observability-utils/array/join_by_key';
import { maybe } from '@kbn/apm-plugin/common/utils/maybe';

export function RegistryProvider() {
  const callbacks: Array<{
    runs: Array<{
      cb: () => void;
    }>;
  }> = [];

  let running: boolean = false;

  function when(title: string, callback: () => void, skip?: boolean) {
    if (running) {
      throw new Error("Can't add tests when running");
    }

    const frame = maybe(callsites()[1]);

    const file = frame?.getFileName();

    if (!file) {
      throw new Error('Could not infer file for suite');
    }

    callbacks.push({
      runs: [
        {
          cb: () => {
            const suite: ReturnType<typeof describe> = (skip ? describe.skip : describe)(
              title,
              () => {
                callback();
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
  }

  when.skip = (title: string, callback: () => void) => {
    when(title, callback, true);
  };

  const registry = {
    when,
    run: () => {
      running = true;

      const groups = joinByKey(callbacks, [], (a, b) => ({
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
        describe(config, () => {
          groupsForConfig.forEach((group) => {
            const { runs } = group;

            describe(config, () => {
              runs.forEach((run) => {
                run.cb();
              });
            });
          });
        });
      });

      running = false;
    },
  };

  return registry;
}
