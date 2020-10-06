/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SuperTest } from 'supertest';
import { USERS, ROLES } from './authentication';
import { User, Role } from './types';

export const createUsersAndRoles = async (es: any, supertest: SuperTest<any>) => {
  const createRole = async ({ name, privileges }: Role) => {
    return await supertest.put(`/api/security/role/${name}`).send(privileges).expect(204);
  };

  const createUser = async ({ username, password, roles, superuser }: User) => {
    // no need to create superuser
    if (superuser) {
      return;
    }
    return await es.shield.putUser({
      username,
      body: {
        password,
        roles,
        full_name: username.replace('_', ' '),
        email: `${username}@elastic.co`,
      },
    });
  };

  for (const role of Object.values(ROLES)) {
    await createRole(role);
  }

  for (const user of Object.values(USERS)) {
    await createUser(user);
  }
};
