/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../plugins/apm/typings/common';
import { SecurityServiceProvider } from '../../../../test/common/services/security';

type SecurityService = PromiseReturnType<typeof SecurityServiceProvider>;

export enum ApmUser {
  apmReadUser = 'apm_read_user',
  apmWriteUser = 'apm_write_user',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
}

const roles = {
  [ApmUser.apmReadUser]: {
    elasticsearch: {
      cluster: [],
      indices: [
        { names: ['observability-annotations'], privileges: ['read', 'view_index_metadata'] },
      ],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
  [ApmUser.apmWriteUser]: {
    elasticsearch: {
      cluster: [],
      indices: [
        { names: ['observability-annotations'], privileges: ['read', 'view_index_metadata'] },
      ],
    },
    kibana: [
      {
        base: [],
        feature: {
          apm: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
  [ApmUser.apmAnnotationsWriteUser]: {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['observability-annotations'],
          privileges: [
            'read',
            'view_index_metadata',
            'index',
            'manage',
            'create_index',
            'create_doc',
          ],
        },
      ],
    },
  },
};

const users = {
  [ApmUser.apmReadUser]: {
    roles: ['apm_user', ApmUser.apmReadUser],
  },
  [ApmUser.apmWriteUser]: {
    roles: ['apm_user', ApmUser.apmWriteUser],
  },
  [ApmUser.apmAnnotationsWriteUser]: {
    roles: ['apm_user', ApmUser.apmWriteUser, ApmUser.apmAnnotationsWriteUser],
  },
};

export async function createApmUser(security: SecurityService, apmUser: ApmUser) {
  const role = roles[apmUser];
  const user = users[apmUser];

  if (!role || !user) {
    throw new Error(`No configuration found for ${apmUser}`);
  }

  await security.role.create(apmUser, role);

  await security.user.create(apmUser, {
    full_name: apmUser,
    password: APM_TEST_PASSWORD,
    roles: user.roles,
  });
}

export const APM_TEST_PASSWORD = 'changeme';
