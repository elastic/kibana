/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityService } from '../../../../../test/common/services/security/security';

export const createUser = async (security: SecurityService, userName: string, roleName: string) => {
  await security.user.create(userName, {
    password: 'changeme',
    roles: [roleName],
    full_name: 'a reporting user',
  });
};

export const createCSPOnlyRole = async (
  security: SecurityService,
  roleName: string,
  indicesName: string
) => {
  await security.role.create(roleName, {
    kibana: [
      {
        feature: { siem: ['read'], fleetv2: ['all'], fleet: ['read'] },
        spaces: ['*'],
      },
    ],
    ...(indicesName.length !== 0
      ? {
          elasticsearch: {
            indices: [
              {
                names: [indicesName],
                privileges: ['read'],
              },
            ],
          },
        }
      : {}),
  });
};

export const deleteRole = async (security: SecurityService, roleName: string) => {
  await security.role.delete(roleName);
};

export const deleteUser = async (security: SecurityService, userName: string) => {
  await security.user.delete(userName);
};
