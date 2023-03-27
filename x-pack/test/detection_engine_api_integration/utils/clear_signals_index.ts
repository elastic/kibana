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
import { countDownTest } from './count_down_test';

/**
 * Deletes all docs in the signals index for use inside of afterEach blocks of tests
 * @param supertest The supertest client library
 */
export const clearSignalsIndex = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  es: Client,
  log: ToolingLog
): Promise<void> => {
  await countDownTest(
    async () => {
      const { body } = await supertest.get(DETECTION_ENGINE_INDEX_URL).send().expect(200);
      const signalsIndex = body.name;
      await es.deleteByQuery({
        index: signalsIndex,
        query: { match_all: {} },
        wait_for_completion: true,
        refresh: true,
      });
      return {
        passed: true,
      };
    },
    'clearSignalsIndex',
    log
  );
};
