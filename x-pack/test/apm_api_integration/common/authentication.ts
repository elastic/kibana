/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseReturnType } from '../../../plugins/observability/typings/common';
import { SecurityServiceProvider } from '../../../../test/common/services/security';

type SecurityService = PromiseReturnType<typeof SecurityServiceProvider>;

export enum ApmUser {
  noAccessUser = 'no_access_user',
  apmReadUser = 'apm_read_user',
  apmWriteUser = 'apm_write_user',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
}

// TODO: Going forward we want to use the built-in roles `viewer` and `editor`. However ML privileges are not included in the built-in roles
// Until https://github.com/elastic/kibana/issues/71422 is closed we have to use the custom roles below
const roles = {
  [ApmUser.noAccessUser]: {},
  [ApmUser.apmReadUser]: {
    kibana: [
      {
        base: [],
        feature: { ml: ['read'] },
        spaces: ['*'],
      },
    ],
  },
  [ApmUser.apmReadUserWithoutMlAccess]: {
    elasticsearch: {
      cluster: [],
      indices: [
        {
          names: ['apm-*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        feature: { apm: ['read'] },
        spaces: ['*'],
      },
    ],
  },
  [ApmUser.apmWriteUser]: {
    kibana: [
      {
        base: [],
        feature: { ml: ['all'] },
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
  [ApmUser.noAccessUser]: {
    roles: [],
  },
  [ApmUser.apmReadUser]: {
    roles: ['viewer', ApmUser.apmReadUser],
  },
  [ApmUser.apmReadUserWithoutMlAccess]: {
    roles: [ApmUser.apmReadUserWithoutMlAccess],
  },
  [ApmUser.apmWriteUser]: {
    roles: ['editor', ApmUser.apmWriteUser],
  },
  [ApmUser.apmAnnotationsWriteUser]: {
    roles: ['editor', ApmUser.apmWriteUser, ApmUser.apmAnnotationsWriteUser],
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
