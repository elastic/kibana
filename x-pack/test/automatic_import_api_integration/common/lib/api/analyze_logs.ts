/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import {
  AnalyzeLogsRequestBody,
  ANALYZE_LOGS_PATH,
  AnalyzeLogsResponse,
} from '@kbn/automatic-import-plugin/common';
import { superUser } from '../authentication/users';
import { User } from '../authentication/types';

export const postAnalyzeLogs = async ({
  supertest,
  req,
  expectedHttpCode = 404,
  auth = { user: superUser },
}: {
  supertest: SuperTest.Agent;
  req: AnalyzeLogsRequestBody;
  expectedHttpCode?: number;
  auth: { user: User };
}): Promise<AnalyzeLogsResponse> => {
  const { body: response } = await supertest
    .post(`${ANALYZE_LOGS_PATH}`)
    .send(req)
    .set('kbn-xsrf', 'abc')
    .set('elastic-api-version', '1')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return response;
};
