/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export function CspSecurityCommonProvider({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const pageObjects = getPageObjects(['security']);

  const roles = [
    {
      name: 'csp_viewer',
      elasticsearch: {
        indices: [
          {
            names: ['logs-cloud_security_posture.findings-*'],
            privileges: ['read'],
          },
          {
            names: ['logs-cloud_security_posture.findings_latest-*'],
            privileges: ['read'],
          },
          {
            names: ['logs-cloud_security_posture.scores-*'],
            privileges: ['read'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'missing_access_findings_latest_role',
      elasticsearch: {
        indices: [
          {
            names: ['logs-cloud_security_posture.findings-*'],
            privileges: ['read'],
          },
          {
            names: ['logs-cloud_security_posture.scores-*'],
            privileges: ['read'],
          },
        ],
      },
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    },
  ];

  const users = [
    {
      name: 'csp_read_user',
      full_name: 'csp viewer',
      password: 'test123',
      roles: ['csp_viewer'],
    },
    {
      name: 'csp_missing_latest_findings_access_user',
      full_name: 'missing latest findings index access',
      password: 'csp123',
      roles: ['missing_access_findings_latest_role'],
    },
  ];

  return {
    async createRoles() {
      for (const role of roles) {
        await security.role.create(role.name, {
          elasticsearch: role.elasticsearch,
          kibana: role.kibana,
        });
      }
    },

    async createUsers() {
      for (const user of users) {
        await security.user.create(user.name, {
          password: user.password,
          roles: user.roles,
          full_name: user.full_name,
        });
      }
    },

    async login(user: string) {
      await pageObjects.security.login(user, this.getPasswordForUser(user), {
        expectSpaceSelector: false,
      });
    },

    async logout() {
      await pageObjects.security.forceLogout();
    },

    async cleanRoles() {
      for (const role of roles) {
        await security.role.delete(role.name);
      }
    },

    async cleanUsers() {
      for (const user of users) {
        await security.user.delete(user.name);
      }
    },

    getPasswordForUser(user: string): string {
      const userConfig = users.find((u) => u.name === user);
      if (userConfig === undefined) {
        throw new Error(`Can't log in user ${user} - not defined`);
      }
      return userConfig.password;
    },
  };
}
