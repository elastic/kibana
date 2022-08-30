/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { UserProfileBulkGetParams, UserProfileServiceStart } from '@kbn/security-plugin/server';
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
