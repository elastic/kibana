/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContextWithSpaces } from '../../ftr_provider_context_with_spaces';
import { SecuritySolutionESSUtilsInterface, Role, User } from './types';

export function SecuritySolutionESSUtils({
  getService,
}: FtrProviderContextWithSpaces): SecuritySolutionESSUtilsInterface {
  const config = getService('config');
  const search = getService('search');
  const supertestWithoutAuth = getService('supertest');
  const security = getService('security');

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

  return {
    getUsername: (_role?: string) =>
      Promise.resolve(config.get('servers.kibana.username') as string),
    createSearch: (_role?: string) => Promise.resolve(search),

    createSuperTest,

    createSuperTestWithUser: (user: User) => {
      return createSuperTest(user.username, user.password);
    },

    cleanUpCustomRole: () => {
      // In ESS this is a no-op
      return Promise.resolve();
    },

    async createUser(user: User): Promise<void> {
      const { username, roles, password } = user;
      await security.user.create(username, { roles, password: password ?? 'changeme' });
    },

    /**
     * Deletes specified users by username
     * @param names[]
     */
    async deleteUsers(names: string[]): Promise<void> {
      for (const name of names) {
        await security.user.delete(name);
      }
    },

    async createRole(name: string, role: Role) {
      return await security.role.create(name, role.privileges);
    },

    /**
     * Deletes specified roles by name
     * @param roles[]
     */
    async deleteRoles(roles: string[]): Promise<void> {
      for (const role of roles) {
        await security.role.delete(role);
      }
    },
  };
}
