/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Should be deleted once all all the remaining tests in this folder get moved to the new /security_solution_api_integration folder

import type SuperTest from 'supertest';

import type { ExceptionList, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import { ToolingLog } from '@kbn/tooling-log';
import { countDownTest } from './count_down_test';

/**
 * Remove all exceptions from both the "single" and "agnostic" spaces.
 * This will retry 50 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest handle
 */
export const deleteAllExceptions = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog
): Promise<void> => {
  await deleteAllExceptionsByType(supertest, log, 'single');
  await deleteAllExceptionsByType(supertest, log, 'agnostic');
};

/**
 * Remove all exceptions by a given type such as "agnostic" or "single".
 * This will retry 50 times before giving up and hopefully still not interfere with other tests
 * @param supertest The supertest handle
 */
export const deleteAllExceptionsByType = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  type: NamespaceType
): Promise<void> => {
  await countDownTest(
    async () => {
      const { body } = await supertest
        .get(`${EXCEPTION_LIST_URL}/_find?per_page=9999&namespace_type=${type}`)
        .set('kbn-xsrf', 'true')
        .send();
      const ids: string[] = body.data.map((exception: ExceptionList) => exception.id);
      for await (const id of ids) {
        await supertest
          .delete(`${EXCEPTION_LIST_URL}?id=${id}&namespace_type=${type}`)
          .set('kbn-xsrf', 'true')
          .send();
      }
      const { body: finalCheck } = await supertest
        .get(`${EXCEPTION_LIST_URL}/_find?namespace_type=${type}`)
        .set('kbn-xsrf', 'true')
        .send();
      return {
        passed: finalCheck.data.length === 0,
      };
    },
    `deleteAllExceptions by type: "${type}"`,
    log,
    50,
    1000
  );
};
