/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { UserProfileBulkGetParams, UserProfileServiceStart } from '@kbn/security-plugin/server';
import { INTERNAL_SUGGEST_USER_PROFILES_URL } from '@kbn/cases-plugin/common/constants';
import { SuggestUserProfilesRequest } from '@kbn/cases-plugin/common/api';
import { UserProfileService } from '@kbn/cases-plugin/server/services';
import { superUser } from './authentication/users';
import { User } from './authentication/types';
import { getSpaceUrlPrefix } from './utils';

type BulkGetUserProfilesParams = Omit<UserProfileBulkGetParams, 'uids'> & { uids: string[] };

export const bulkGetUserProfiles = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: BulkGetUserProfilesParams;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<UserProfileServiceStart['bulkGet']> => {
  const { uids, ...restParams } = req;
  const uniqueIDs = [...new Set(uids)];

  const { body: profiles } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}/internal/security/user_profile/_bulk_get`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send({ uids: uniqueIDs, ...restParams })
    .expect(expectedHttpCode);

  return profiles;
};

export const suggestUserProfiles = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: SuggestUserProfilesRequest;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<UserProfileService['suggest']> => {
  const { body: profiles } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${INTERNAL_SUGGEST_USER_PROFILES_URL}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return profiles;
};

export const loginUsers = async ({
  supertest,
  users = [superUser],
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  users?: User[];
}) => {
  for (const user of users) {
    await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username: user.username, password: user.password },
      })
      .expect(200);
  }
};
