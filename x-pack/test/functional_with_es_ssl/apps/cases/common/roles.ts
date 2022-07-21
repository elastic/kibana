/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '../../../../cases_api_integration/common/lib/authentication/types';

/**
 * Roles for Cases in the stack
 */

export const casesReadDelete: Role = {
  name: 'cases_read_delete',
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
          generalCases: ['minimal_read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const casesNoDelete: Role = {
  name: 'cases_no_delete',
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
          generalCases: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const casesAll: Role = {
  name: 'cases_all_role',
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
          generalCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles = [casesReadDelete, casesNoDelete, casesAll];
