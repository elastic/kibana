/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';

import { countDownTest } from './count_down_test';

export const deleteAllAnomalies = async (
  log: ToolingLog,
  es: Client,
  index: string[] = ['.ml-anomalies-*']
): Promise<void> => {
  await countDownTest(
    async () => {
      await es.deleteByQuery({
        index,
        body: {
          query: {
            match_all: {},
          },
        },
        refresh: true,
      });
      return {
        passed: true,
      };
    },
    'deleteAllAnomalies',
    log
  );
};
