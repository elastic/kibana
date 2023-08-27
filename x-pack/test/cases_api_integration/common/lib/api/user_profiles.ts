/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { parse as parseCookie, Cookie } from 'tough-cookie';

import { INTERNAL_SUGGEST_USER_PROFILES_URL } from '@kbn/cases-plugin/common/constants';
import { UserProfileService } from '@kbn/cases-plugin/server/services';
import type {
  UserProfile,
  UserProfileAvatarData,
  UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { SuggestUserProfilesRequest } from '@kbn/cases-plugin/common/types/api';
import { superUser } from '../authentication/users';
import { User } from '../authentication/types';
import { getSpaceUrlPrefix } from './helpers';
import { FtrProviderContext as CommonFtrProviderContext } from '../../ftr_provider_context';
import { getUserInfo } from '../authentication';

interface BulkGetUserProfilesParams<T> {
  uids: string[];
  dataPath?: T;
}

export const generateFakeAssignees = (num: number) =>
  Array.from(Array(num).keys()).map((uid) => {
    return { uid: `${uid}` };
  });

export const bulkGetUserProfiles = async <T extends string>({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: BulkGetUserProfilesParams<T>;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): Promise<Array<T extends 'avatar' ? UserProfileWithAvatar : UserProfile>> => {
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

/**
 * Updates the avatar of a user.
 * The API needs a valid user session.
 * The session acts as the user identifier
 * whose the avatar is updated.
 */
export const updateUserProfileAvatar = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  headers = {},
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: UserProfileAvatarData;
  expectedHttpCode?: number;
  headers?: Record<string, unknown>;
}): Promise<void> => {
  await supertest
    .post('/internal/security/user_profile/_data')
    .set('kbn-xsrf', 'true')
    .set(headers)
    .send({ avatar: req })
    .expect(expectedHttpCode);
};

export const loginUsers = async ({
  supertest,
  users = [superUser],
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  users?: User[];
}) => {
  const cookies: Cookie[] = [];

  for (const user of users) {
    const response = await supertest
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username: user.username, password: user.password },
      })
      .expect(200);

    cookies.push(parseCookie(response.header['set-cookie'][0])!);
  }

  return cookies;
};

export const setupSuperUserProfile = async (getService: CommonFtrProviderContext['getService']) => {
  const security = getService('security');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const superUserInfo = getUserInfo(superUser);

  // ensure the user's information is what we expect
  await security.user.create(superUser.username, {
    password: superUser.password,
    roles: superUser.roles,
    full_name: superUserInfo.full_name,
    email: superUserInfo.email,
  });

  const cookies = await loginUsers({
    supertest: supertestWithoutAuth,
    users: [superUser],
  });

  const headers = {
    Cookie: cookies[0].cookieString(),
  };

  const profiles = await suggestUserProfiles({
    supertest: supertestWithoutAuth,
    req: {
      name: 'superUser',
      owners: ['securitySolutionFixture'],
      size: 1,
    },
    auth: { user: superUser, space: null },
  });

  const superUserWithProfile = {
    ...getUserInfo(superUser),
    profile_uid: profiles[0].uid,
  };

  return {
    headers,
    superUserWithProfile,
    superUserInfo,
  };
};
