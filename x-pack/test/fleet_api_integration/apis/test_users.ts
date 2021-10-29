/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityService } from '../../../../test/common/services/security/security';

export const testUsers: {
  [rollName: string]: { username: string; password: string; permissions?: any };
} = {
  fleet_no_access: {
    permissions: {
      feature: {
        dashboards: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_no_access',
    password: 'changeme',
  },
  fleet_read_only: {
    permissions: {
      feature: {
        fleet: ['read'],
      },
      spaces: ['*'],
    },
    username: 'fleet_read_only',
    password: 'changeme',
  },
  fleet_all: {
    permissions: {
      feature: {
        fleet: ['all'],
      },
      spaces: ['*'],
    },
    username: 'fleet_all',
    password: 'changeme',
  },
};

export const setupTestUsers = async (security: SecurityService) => {
  for (const roleName in testUsers) {
    if (testUsers.hasOwnProperty(roleName)) {
      const user = testUsers[roleName];

      if (user.permissions) {
        await security.role.create(roleName, {
          kibana: [user.permissions],
        });
      }

      await security.user.create(user.username, {
        password: user.password,
        roles: [roleName],
        full_name: user.username,
      });
    }
  }
};
