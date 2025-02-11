/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type SuperTest from 'supertest';
import {
  CategorizationRequestBody,
  CATEGORIZATION_GRAPH_PATH,
  CategorizationResponse,
} from '@kbn/automatic-import-plugin/common';
import { superUser } from '../authentication/users';
import { User } from '../authentication/types';
import { BadRequestError } from '../error/error';

export const postCategorization = async ({
  supertest,
  req,
  expectedHttpCode = 404,
  auth = { user: superUser },
}: {
  supertest: SuperTest.Agent;
  req: CategorizationRequestBody;
  expectedHttpCode?: number;
  auth: { user: User };
}): Promise<CategorizationResponse | BadRequestError> => {
  const { body: response } = await supertest
    .post(`${CATEGORIZATION_GRAPH_PATH}`)
    .send(req)
    .set('kbn-xsrf', 'abc')
    .set('elastic-api-version', '1')
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  if (response.statusCode === 400) {
    return new BadRequestError(response.message);
  }

  return response;
};
