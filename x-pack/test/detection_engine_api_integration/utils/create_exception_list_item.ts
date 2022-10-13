/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

/**
 * Helper to cut down on the noise in some of the tests. This checks for
 * an expected 200 still and does not try to any retries. Creates exception lists
 * @param supertest The supertest deps
 * @param exceptionListItem The exception list item to create
 * @param log The tooling logger
 */
export const createExceptionListItem = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  exceptionListItem: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> => {
  const response = await supertest
    .post(EXCEPTION_LIST_ITEM_URL)
    .set('kbn-xsrf', 'true')
    .send(exceptionListItem);

  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when creating an exception list item (createExceptionListItem). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }
  return response.body;
};
