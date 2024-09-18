/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { DETECTION_ENGINE_INDEX_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from '../count_down_test';

/**
 * Deletes all alerts from a given index or indices, defaults to `.alerts-security.alerts-*`
 * For use inside of afterEach blocks of tests
 */
export const deleteAllAlerts = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  es: Client,
  index: Array<'.alerts-security.alerts-*' | '.preview.alerts-security.alerts-*'> = [
    '.alerts-security.alerts-*',
  ]
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest
        .delete(DETECTION_ENGINE_INDEX_URL)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send();
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
    'deleteAllAlerts',
    log
  );
};
