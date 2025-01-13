/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext as CommonFtrProviderContext } from '../../ftr_provider_context';
import { Role, User, UserInfo } from './types';
import { allUsers } from './users';
import { allRoles } from './roles';
import { spaces } from './spaces';

export const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

export const createSpaces = async (getService: CommonFtrProviderContext['getService']) => {
  const spacesService = getService('spaces');
  for (const space of spaces) {
    await spacesService.create(space);
  }
};

/**
 * Creates the users and roles for use in the tests. Defaults to specific users and roles used by the security_and_spaces
 * scenarios but can be passed specific ones as well.
 */
export const createUsersAndRoles = async (
  getService: CommonFtrProviderContext['getService'],
  usersToCreate: User[] = allUsers,
  rolesToCreate: Role[] = allRoles
) => {
  const security = getService('security');

  const createRole = async ({ name, privileges }: Role) => {
    return security.role.create(name, privileges);
  };

  const createUser = async (user: User) => {
    const userInfo = getUserInfo(user);

    return security.user.create(user.username, {
      password: user.password,
      roles: user.roles,
      full_name: userInfo.full_name,
      email: userInfo.email,
    });
  };

  for (const role of rolesToCreate) {
    await createRole(role);
  }

  for (const user of usersToCreate) {
    await createUser(user);
  }
};

export const deleteSpaces = async (getService: CommonFtrProviderContext['getService']) => {
  const spacesService = getService('spaces');
  for (const space of spaces) {
    try {
      await spacesService.delete(space.id);
    } catch (error) {
      // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
    }
  }
};

export const deleteUsersAndRoles = async (
  getService: CommonFtrProviderContext['getService'],
  usersToDelete: User[] = allUsers,
  rolesToDelete: Role[] = allRoles
) => {
  const security = getService('security');

  for (const user of usersToDelete) {
    try {
      await security.user.delete(user.username);
    } catch (error) {
      // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
    }
  }

  for (const role of rolesToDelete) {
    try {
      await security.role.delete(role.name);
    } catch (error) {
      // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
    }
  }
};

export const createSpacesAndUsers = async (getService: CommonFtrProviderContext['getService']) => {
  await createSpaces(getService);
  await createUsersAndRoles(getService);
};

export const deleteSpacesAndUsers = async (getService: CommonFtrProviderContext['getService']) => {
  await deleteSpaces(getService);
  await deleteUsersAndRoles(getService);
};
