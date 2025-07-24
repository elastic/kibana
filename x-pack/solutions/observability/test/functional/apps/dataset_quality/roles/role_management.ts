/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityFtrProviderContext } from '../config';

const datasetQualityRoles = {
  fullAccess: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['logs-*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          dataQuality: ['all'],
          discover: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
  canManageRules: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['logs-*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          dataQuality: ['minimal_all', 'manage_rules'],
          discover: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
  canManageAlerts: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['logs-*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          dataQuality: ['minimal_all', 'manage_alerts'],
          discover: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
  noAccess: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [],
    },
    kibana: [
      {
        feature: {
          dataQuality: ['none'],
          discover: ['all'],
          fleet: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

const getDatasetQualityRole = (
  roleType: keyof typeof datasetQualityRoles,
  indices?: Array<{ names: string[]; privileges: string[] }>
) => {
  const role = datasetQualityRoles[roleType];

  if (!indices) {
    return role;
  }

  return {
    ...role,
    elasticsearch: {
      ...role.elasticsearch,
      indices,
    },
  };
};

export async function createDatasetQualityUserWithRole(
  security: ReturnType<DatasetQualityFtrProviderContext['getService']>,
  username: keyof typeof datasetQualityRoles,
  indices?: Array<{ names: string[]; privileges: string[] }>
) {
  const role = `${username}-role`;
  const password = `${username}-password`;
  const name = `${username}-name`;

  await security.role.create(role, getDatasetQualityRole(username, indices));

  return security.user.create(username, {
    password,
    roles: [role],
    full_name: name,
  });
}

export async function deleteDatasetQualityUserWithRole(
  security: ReturnType<DatasetQualityFtrProviderContext['getService']>,
  username: keyof typeof datasetQualityRoles
) {
  await security.user.delete(username);
  await security.role.delete(`${username}-role`);
}
