/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';

import { UserProfileServiceStart } from '@kbn/security-plugin/server';
import {
  INTERNAL_USER_PROFILES_BULK_GET,
  UserProfilesBulkGetParams,
} from '../fixtures/plugins/security_solution/server';
import { superUser } from './authentication/users';
import { User } from './authentication/types';
import { getSpaceUrlPrefix } from './utils';

export const bulkGetUserProfiles = async ({
  supertest,
  req,
  expectedHttpCode = 200,
  auth = { user: superUser, space: null },
}: {
  supertest: SuperTest.SuperTest<SuperTest.Test>;
  req: UserProfilesBulkGetParams;
  expectedHttpCode?: number;
  auth?: { user: User; space: string | null };
}): ReturnType<UserProfileServiceStart['bulkGet']> => {
  const { body: profiles } = await supertest
    .post(`${getSpaceUrlPrefix(auth.space)}${INTERNAL_USER_PROFILES_BULK_GET}`)
    .auth(auth.user.username, auth.user.password)
    .set('kbn-xsrf', 'true')
    .send(req)
    .expect(expectedHttpCode);

  return profiles;
};
