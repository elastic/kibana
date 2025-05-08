/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from './types';

export const playgroundAllRole: Role = {
  name: 'playground_test_all',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        base: ['all'],
        feature: {},
        spaces: ['*'],
      },
    ],
  },
};

export const playgroundReadRole: Role = {
  name: 'playground_test_read',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['read'] }],
    },
    kibana: [
      {
        base: ['read'],
        feature: {},
        spaces: ['*'],
      },
    ],
  },
};

export const playgroundNoAccessRole: Role = {
  name: 'playground_test_no_access',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          discover: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const ROLES = {
  ALL: playgroundAllRole,
  READ: playgroundReadRole,
  NO_ACCESS: playgroundNoAccessRole,
};
export const ALL_ROLES = Object.values(ROLES);
