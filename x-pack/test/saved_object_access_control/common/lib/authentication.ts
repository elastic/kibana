/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROLES = {
  ALICE: {
    name: 'alice',
    privileges: {
      kibana: [
        {
          feature: {
            discover: ['all'],
            testConfidentialPlugin: ['all'],
          },
          spaces: ['default'],
        },
        {
          feature: {
            testConfidentialPlugin: ['read'],
          },
          spaces: ['space_1'],
        },
      ],
    },
  },
  BOB: {
    name: 'bob',
    privileges: {
      kibana: [
        {
          feature: {
            testConfidentialPlugin: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  CHARLIE: {
    name: 'charlie',
    privileges: {
      kibana: [
        {
          feature: {
            discover: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
};

export const USERS = {
  ALICE: {
    username: 'alice',
    password: 'password',
    roles: [ROLES.ALICE.name],
    description: 'Alice',
  },
  BOB: {
    username: 'bob',
    password: 'password',
    roles: [ROLES.BOB.name],
    description: 'Bob',
  },
  CHARLIE: {
    username: 'charlie',
    password: 'password',
    roles: [ROLES.CHARLIE.name],
    description: 'A user without access to the confidential saved object type',
  },
  KIBANA_ADMIN: {
    username: 'kibana_admin_user',
    password: 'changeme',
    roles: ['kibana_admin'],
    superuser: false,
    description: 'Kibana Administrator',
  },
  SUPERUSER: {
    username: 'elastic',
    password: 'changeme',
    roles: [],
    superuser: true,
    description: 'superuser',
  },
};
