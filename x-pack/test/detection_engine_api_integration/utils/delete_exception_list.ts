/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type SuperTest from 'supertest';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import type { FullResponseSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

/**
 * Helper to cut down on the noise in some of the tests. Does a delete of an exception list.
 * It does not check for a 200 "ok" on this.
 * @param supertest The supertest deps
 * @param listId The exception list to delete
 * @param log The tooling logger
 */
export const deleteExceptionList = async (
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  log: ToolingLog,
  listId: string
): Promise<FullResponseSchema> => {
  const response = await supertest
    .delete(`${EXCEPTION_LIST_URL}?list_id=${listId}`)
    .set('kbn-xsrf', 'true');
  if (response.status !== 200) {
    log.error(
      `Did not get an expected 200 "ok" when deleting an exception list (deleteExceptionList). CI issues could happen. Suspect this line if you are seeing CI issues. body: ${JSON.stringify(
        response.body
      )}, status: ${JSON.stringify(response.status)}`
    );
  }

  return response.body;
};
