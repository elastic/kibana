/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UserActionFindResponse,
  getCaseFindUserActionsUrl,
  UserActionFindRequest,
} from '@kbn/cases-plugin/common/api';
import type SuperTest from 'supertest';
import { User } from './authentication/types';

import { superUser } from './authentication/users';
import { getSpaceUrlPrefix } from './utils';

export const findCaseUserActions = async ({
  supertest,
  caseID,
  options,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseID: string;
  options: UserActionFindRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<UserActionFindResponse> => {
  const { body: userActions } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseFindUserActionsUrl(caseID)}`)
    .query(options)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return userActions;
};
