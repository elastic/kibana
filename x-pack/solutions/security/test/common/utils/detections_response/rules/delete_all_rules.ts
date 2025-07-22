/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from '../count_down_test';

/**
 * Removes all rules by looping over any found and removing them from REST.
 * @param supertest The supertest agent.
 */
export const deleteAllRules = async (
  supertest: SuperTest.Agent,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .send({ action: 'delete', query: '' })
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31');

      const { body: finalCheck } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .send();
      return {
        passed: finalCheck.data.length === 0,
      };
    },
    'deleteAllRules',
    log,
    50,
    1000
  );
};
