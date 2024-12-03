/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import { parse as parseCookie, Cookie } from 'tough-cookie';
import { superUser } from '../authentication/users';
import { User } from '../authentication/types';

export const loginUsers = async ({
  supertest,
  users = [superUser],
}: {
  supertest: SuperTest.Agent;
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
