/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type {
  CreateExceptionListSchema,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { deleteExceptionList } from './delete_exception_list';

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not try to any retries. Creates exception lists
 * @param supertest The supertest deps
 * @param exceptionList The exception list to create
 * @param log The tooling logger
 */
export const createExceptionList = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  exceptionList: CreateExceptionListSchema
): Promise<ExceptionListSchema> => {
  const response = await supertest
    .post(EXCEPTION_LIST_URL)
    .set('kbn-xsrf', 'true')
    .send(exceptionList);

  if (response.status === 409) {
    if (exceptionList.list_id != null) {
      log.error(
        `When creating an exception list found an unexpected conflict (409) creating an exception list (createExceptionList), will attempt a cleanup and one time re-try. This usually indicates a bad cleanup or race condition within the tests: ${JSON.stringify(
          response.body
        )}, status: ${JSON.stringify(response.status)}`
      );
      await deleteExceptionList(supertest, log, exceptionList.list_id);
      const secondResponseTry = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(exceptionList);
      if (secondResponseTry.status !== 200) {
        throw new Error(
          `Unexpected non 200 ok when attempting to create an exception list (second try): ${JSON.stringify(
            response.body
          )}`
        );
      } else {
        return secondResponseTry.body;
      }
    } else {
      throw new Error('When creating an exception list found an unexpected conflict (404)');
    }
  } else if (response.status !== 200) {
    throw new Error(
      `Unexpected non 200 ok when attempting to create an exception list: ${JSON.stringify(
        response.status
      )}`
    );
  } else {
    return response.body;
  }
};
