/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext as CommonFtrProviderContext } from '../../../common/ftr_provider_context';
import { Role, User, UserInfo } from './types';
import { superUser, users } from './users';
import { roles } from './roles';
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

const createUsersAndRoles = async (getService: CommonFtrProviderContext['getService']) => {
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

  for (const role of roles) {
    await createRole(role);
  }

  for (const user of users) {
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
const deleteUsersAndRoles = async (getService: CommonFtrProviderContext['getService']) => {
  const security = getService('security');

  for (const user of users) {
    try {
      await security.user.delete(user.username);
    } catch (error) {
      // ignore errors because if a migration is run it will delete the .kibana index which remove the spaces and users
    }
  }

  for (const role of roles) {
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

export const superUserSpace1Auth = { user: superUser, space: 'space1' };
