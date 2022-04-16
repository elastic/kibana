/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { ToolingLog } from '@kbn/dev-utils';

import { DETECTION_ENGINE_INDEX_URL } from '@kbn/security-solution-plugin/common/constants';
import { countDownTest } from './count_down_test';

/**
 * Creates the signals index for use inside of beforeEach blocks of tests
 * This will retry 50 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest client library
 */
export const createSignalsIndex = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      await supertest.post(DETECTION_ENGINE_INDEX_URL).set('kbn-xsrf', 'true').send();
      return {
        passed: true,
      };
    },
    'createSignalsIndex',
    log
  );
};
