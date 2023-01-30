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
  getCaseUserActionUrl,
  CaseUserActionDeprecatedResponse,
  CaseUserActionsDeprecatedResponse,
  GetCaseUsersResponse,
  getCaseUsersUrl,
} from '@kbn/cases-plugin/common/api';
import type SuperTest from 'supertest';
import { User } from './authentication/types';

import { superUser } from './authentication/users';
import { getSpaceUrlPrefix, removeServerGeneratedPropertiesFromObject } from './utils';

export const removeServerGeneratedPropertiesFromUserAction = (
  attributes: CaseUserActionDeprecatedResponse
) => {
  const keysToRemove: Array<keyof CaseUserActionDeprecatedResponse> = ['action_id', 'created_at'];
  return removeServerGeneratedPropertiesFromObject<
    CaseUserActionDeprecatedResponse,
    typeof keysToRemove[number]
  >(attributes, keysToRemove);
};

export const getCaseUserActions = async ({
  supertest,
  caseID,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseID: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseUserActionsDeprecatedResponse> => {
  const { body: userActions } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseUserActionUrl(caseID)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);
  return userActions;
};

export const findCaseUserActions = async ({
  supertest,
  caseID,
  options = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseID: string;
  options?: UserActionFindRequest;
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

export const getCaseUsers = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<GetCaseUsersResponse> => {
  const { body: users } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseUsersUrl(caseId)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);
  return users as GetCaseUsersResponse;
};
