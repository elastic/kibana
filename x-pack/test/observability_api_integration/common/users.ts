/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityService } from 'test/common/services/security/security';

export enum User {
  apmReadUser = 'apm_read_user',
  apmWriteUser = 'apm_write_user',
}

export const roles = {
  [User.apmReadUser]: {
    kibana: [
      {
        base: [],
        feature: { ml: ['read'] },
        spaces: ['*'],
      },
    ],
  },
  [User.apmWriteUser]: {
    kibana: [
      {
        base: [],
        feature: { ml: ['all'] },
        spaces: ['*'],
      },
    ],
  },
};

export const users = {
  [User.apmReadUser]: {
    roles: ['viewer', User.apmReadUser],
  },
  [User.apmWriteUser]: {
    roles: ['editor', User.apmWriteUser],
  },
};

export const TEST_PASSWORD = 'changeme';

export async function createUser(security: SecurityService, user: User) {
  const roleDef = roles[user];
  const userDef = users[user];

  if (!roleDef || !userDef) {
    throw new Error(`No configuration found for ${user}`);
  }

  await security.role.create(user, roleDef);

  await security.user.create(user, {
    full_name: user,
    password: TEST_PASSWORD,
    roles: userDef.roles,
  });
}
