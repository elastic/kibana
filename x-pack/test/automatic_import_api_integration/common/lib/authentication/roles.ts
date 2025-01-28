/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from './types';

export const noIntegrationsPrivileges: Role = {
  name: 'no_integrations_kibana_privileges',
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
          fleetv2: ['read'],
          fleet: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const onlyActions: Role = {
  name: 'only_actions',
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
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles = [noIntegrationsPrivileges, onlyActions];
