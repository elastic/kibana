/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { SecurityServiceProvider } from '../../../../test/common/services/security';
import { PrivilegeType } from '../../../plugins/apm/common/privilege_type';

type SecurityService = Awaited<ReturnType<typeof SecurityServiceProvider>>;

export enum ApmUser {
  noAccessUser = 'no_access_user',
  apmReadUser = 'apm_read_user',
  apmWriteUser = 'apm_write_user',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
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
  [ApmUser.apmManageOwnAgentKeys]: {
    elasticsearch: {
      cluster: ['manage_own_api_key'],
    },
  },
  [ApmUser.apmManageOwnAndCreateAgentKeys]: {
    applications: [
      {
        application: 'apm',
        privileges: [PrivilegeType.AGENT_CONFIG, PrivilegeType.EVENT, PrivilegeType.SOURCEMAP],
        resources: ['*'],
      },
    ],
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
  [ApmUser.apmManageOwnAgentKeys]: {
    roles: ['editor', ApmUser.apmManageOwnAgentKeys],
  },
  [ApmUser.apmManageOwnAndCreateAgentKeys]: {
    roles: ['editor', ApmUser.apmManageOwnAgentKeys, ApmUser.apmManageOwnAndCreateAgentKeys],
  },
};

export async function createApmUser(security: SecurityService, apmUser: ApmUser, es: Client) {
  const role = roles[apmUser];
  const user = users[apmUser];

  if (!role || !user) {
    throw new Error(`No configuration found for ${apmUser}`);
  }

  if ('applications' in role) {
    // Add application privileges with es client as they are not supported by
    // security.user.create. They are preserved when updating the role below
    await es.security.putRole({
      name: apmUser,
      body: role,
    });
    delete (role as any).applications;
  }

  await security.role.create(apmUser, role);

  await security.user.create(apmUser, {
    full_name: apmUser,
    password: APM_TEST_PASSWORD,
    roles: user.roles,
  });
}

export const APM_TEST_PASSWORD = 'changeme';
