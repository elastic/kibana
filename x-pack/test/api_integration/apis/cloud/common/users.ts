/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const roleDiscoverAll = {
  name: 'all_role_api_int',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          discover: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const userDiscoverAll = {
  username: 'sec_read_user_api_int',
  password: 'password',
  roles: [roleDiscoverAll.name],
};
