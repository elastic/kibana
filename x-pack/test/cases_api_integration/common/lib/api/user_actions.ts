/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCaseFindUserActionsUrl,
  getCaseUserActionStatsUrl,
  getCaseUsersUrl,
} from '@kbn/cases-plugin/common/api';
import {
  CaseUserActionStatsResponse,
  GetCaseUsersResponse,
  UserActionFindRequest,
  UserActionFindResponse,
} from '@kbn/cases-plugin/common/types/api';
import type SuperTest from 'supertest';
import { UserAction } from '@kbn/cases-plugin/common/types/domain';
import { User } from '../authentication/types';

import { superUser } from '../authentication/users';
import { getSpaceUrlPrefix } from './helpers';
import { removeServerGeneratedPropertiesFromObject } from './omit';

export const removeServerGeneratedPropertiesFromUserAction = (attributes: UserAction) => {
  const keysToRemove: Array<keyof UserAction> = ['id', 'created_at', 'version'];
  return removeServerGeneratedPropertiesFromObject<UserAction, (typeof keysToRemove)[number]>(
    attributes,
    keysToRemove
  );
};

export const findCaseUserActions = async ({
  supertest,
  caseID,
  options = {},
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
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

export const getCaseUserActionStats = async ({
  supertest,
  caseID,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseID: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<CaseUserActionStatsResponse> => {
  const { body: userActionStats } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseUserActionStatsUrl(caseID)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);

  return userActionStats;
};

export const getCaseUsers = async ({
  supertest,
  caseId,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.Agent;
  caseId: string;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<GetCaseUsersResponse> => {
  const { body: users } = await supertest
    .get(`${getSpaceUrlPrefix(auth.space)}${getCaseUsersUrl(caseId)}`)
    .auth(auth.user.username, auth.user.password)
    .expect(expectedHttpCode);
  return users;
};
