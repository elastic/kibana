/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { User, Role, UserInfo } from './types';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

/**
 * Creates the users and roles for use in the tests. Defaults to specific users and roles used by the security_and_spaces
 * scenarios but can be passed specific ones as well.
 */
export const createUsersAndRoles = async (
  getService: FtrProviderContext['getService'],
  usersToCreate: User[],
  rolesToCreate: Role[]
) => {
  const security = getService('security');

  const createRole = async ({ name, privileges }: Role) => {
    return await security.role.create(name, privileges);
  };

  const createUser = async (user: User) => {
    const userInfo = getUserInfo(user);

    return await security.user.create(user.username, {
      password: user.password,
      roles: user.roles,
      full_name: userInfo.full_name,
      email: userInfo.email,
    });
  };

  await Promise.all(rolesToCreate.map((role) => createRole(role)));
  await Promise.all(usersToCreate.map((user) => createUser(user)));
};

export const deleteUsersAndRoles = async (
  getService: FtrProviderContext['getService'],
  usersToDelete: User[],
  rolesToDelete: Role[]
) => {
  const security = getService('security');

  try {
    await Promise.allSettled(usersToDelete.map((user) => security.user.delete(user.username)));
  } catch (error) {
    // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
  }

  try {
    await Promise.allSettled(rolesToDelete.map((role) => security.role.delete(role.name)));
  } catch (error) {
    // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
  }
};
