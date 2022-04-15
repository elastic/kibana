/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/dev-utils';
import type SuperTest from 'supertest';

import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
} from '../../../plugins/security_solution/common/constants';
import { countDownTest } from './count_down_test';

/**
 * Removes all rules by looping over any found and removing them from REST.
 * @param supertest The supertest agent.
 */
export const deleteAllAlerts = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest
        .post(DETECTION_ENGINE_RULES_BULK_ACTION)
        .send({ action: 'delete', query: '' })
        .set('kbn-xsrf', 'true');

      const { body: finalCheck } = await supertest
        .get(`${DETECTION_ENGINE_RULES_URL}/_find`)
        .set('kbn-xsrf', 'true')
        .send();
      return {
        passed: finalCheck.data.length === 0,
      };
    },
    'deleteAllAlerts',
    log,
    50,
    1000
  );
};
