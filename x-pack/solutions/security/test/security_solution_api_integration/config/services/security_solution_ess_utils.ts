/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import type { FtrProviderContextWithSpaces } from '../../ftr_provider_context_with_spaces';
import type { SecuritySolutionUtilsInterface, CustomRole, User } from './types';

export function SecuritySolutionESSUtils({
  getService,
}: FtrProviderContextWithSpaces): SecuritySolutionUtilsInterface {
  const config = getService('config');
  const search = getService('search');
  const supertestWithoutAuth = getService('supertest');
  const security = getService('security');
  const createdCustomRolesAndUsers = new Set<string>();

  const createSuperTest = async (role?: string, password: string = 'changeme') => {
    if (!role) {
      return supertestWithoutAuth;
    }
    const kbnUrl = formatUrl({
      ...config.get('servers.kibana'),
      auth: false,
    });

    return supertest.agent(kbnUrl).auth(role, password);
  };

  const createUser = async (user: User): Promise<void> => {
    const { username, roles, password } = user;
    await security.user.create(username, { roles, password: password ?? 'changeme' });
  };

  const createRole = async (name: string, role: CustomRole) => {
    return await security.role.create(name, role.privileges);
  };

  const createSuperTestWithCustomRole = async (roleDefinition: CustomRole) => {
    await createRole(roleDefinition.name, roleDefinition);
    await createUser({
      username: roleDefinition.name,
      password: 'changeme',
      roles: [roleDefinition.name],
    });
    createdCustomRolesAndUsers.add(roleDefinition.name);
    return createSuperTest(roleDefinition.name);
  };

  const deleteUsers = async (names: string[]): Promise<void> => {
    for (const name of names) {
      await security.user.delete(name);
    }
  };

  const deleteRoles = async (roles: string[]): Promise<void> => {
    for (const role of roles) {
      await security.role.delete(role);
    }
  };

  return {
    getUsername: (_role?: string) =>
      Promise.resolve(config.get('servers.kibana.username') as string),
    createSearch: (_role?: string) => Promise.resolve(search),

    createSuperTest,

    createSuperTestWithCustomRole,

    cleanUpCustomRoles: async () => {
      const rolesAndUsersList = Array.from(createdCustomRolesAndUsers);
      await deleteUsers(rolesAndUsersList);
      await deleteRoles(rolesAndUsersList);

      createdCustomRolesAndUsers.clear();
    },
  };
}
