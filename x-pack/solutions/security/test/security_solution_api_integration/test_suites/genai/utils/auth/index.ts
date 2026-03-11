/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role, Space, User, UserInfo } from './types';
import { allUsers } from './users';
import { allRoles } from './roles';
import { spaces } from './spaces';

interface ConfigService {
  get(key: 'serverless'): boolean;
}

interface SecurityService {
  role: {
    create(roleName: string, privileges: Role['privileges']): Promise<void>;
    delete(roleName: string): Promise<void>;
  };
  user: {
    create(
      username: string,
      userDefinition: {
        password: string;
        roles: string[];
        full_name: string;
        email: string;
      }
    ): Promise<void>;
    delete(username: string): Promise<void>;
  };
}

interface SpacesService {
  create(space: Space): Promise<void>;
  delete(spaceId: string): Promise<void>;
}

interface GetGenAiAuthService {
  (name: 'config'): ConfigService;
  (name: 'security'): SecurityService;
  (name: 'spaces'): SpacesService;
}

export const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

export const createSpaces = async (getService: GetGenAiAuthService): Promise<void> => {
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
  getService: GetGenAiAuthService,
  usersToCreate: User[] = allUsers,
  rolesToCreate: Role[] = allRoles
): Promise<void> => {
  const config = getService('config');
  const isServerless = config.get('serverless');
  if (isServerless) {
    return;
  }

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

export const deleteSpaces = async (getService: GetGenAiAuthService): Promise<void> => {
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
  getService: GetGenAiAuthService,
  usersToDelete: User[] = allUsers,
  rolesToDelete: Role[] = allRoles
): Promise<void> => {
  const config = getService('config');
  const isServerless = config.get('serverless');
  if (isServerless) {
    return;
  }

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

export const createSpacesAndUsers = async (getService: GetGenAiAuthService): Promise<void> => {
  await createSpaces(getService);
  await createUsersAndRoles(getService);
};

export const deleteSpacesAndUsers = async (getService: GetGenAiAuthService): Promise<void> => {
  await deleteSpaces(getService);
  await deleteUsersAndRoles(getService);
};
