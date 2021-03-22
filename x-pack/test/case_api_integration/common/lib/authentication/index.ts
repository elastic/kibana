/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext as CommonFtrProviderContext } from '../../../common/ftr_provider_context';
import { Role, User } from './types';
import { users } from './users';
import { roles } from './roles';
import { spaces } from './spaces';

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

  const createUser = async ({ username, password, roles: userRoles }: User) => {
    return await security.user.create(username, {
      password,
      roles: userRoles,
      full_name: username.replace('_', ' '),
      email: `${username}@elastic.co`,
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
    await spacesService.delete(space.id);
  }
};
const deleteUsersAndRoles = async (getService: CommonFtrProviderContext['getService']) => {
  const security = getService('security');

  for (const user of users) {
    await security.user.delete(user.username);
  }

  for (const role of roles) {
    await security.role.delete(role.name);
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
