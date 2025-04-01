/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext as CommonFtrProviderContext } from '../../ftr_provider_context';
import { Role, User, UserInfo } from './types';
import { noIntegrationsUser, users } from './users';
import { roles } from './roles';
import { loginUsers } from '../api';

export const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

/**
 * Creates the users and roles for use in the tests. Defaults to specific users and roles used by the security
 * scenarios but can be passed specific ones as well.
 */
export const createUsersAndRoles = async (
  getService: CommonFtrProviderContext['getService'],
  usersToCreate: User[] = users,
  rolesToCreate: Role[] = roles
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
  getService: CommonFtrProviderContext['getService'],
  usersToDelete: User[] = users,
  rolesToDelete: Role[] = roles
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

export const createUsers = async (getService: CommonFtrProviderContext['getService']) => {
  await createUsersAndRoles(getService);
};

export const deleteUsers = async (getService: CommonFtrProviderContext['getService']) => {
  await deleteUsersAndRoles(getService);
};

export const activateUserProfiles = async (getService: CommonFtrProviderContext['getService']) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  await loginUsers({
    supertest: supertestWithoutAuth,
    users: [noIntegrationsUser],
  });
};
