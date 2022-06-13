/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { PrivilegeType } from '@kbn/apm-plugin/common/privilege_type';
import { SecurityServiceProvider } from '../../../../test/common/services/security';

type SecurityService = Awaited<ReturnType<typeof SecurityServiceProvider>>;

export enum ApmUser {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
}

const roles = {
  [ApmUser.noAccessUser]: {},
  [ApmUser.viewerUser]: {},
  [ApmUser.editorUser]: {},
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
  [ApmUser.viewerUser]: {
    roles: ['viewer'],
  },
  [ApmUser.editorUser]: {
    roles: ['editor'],
  },
  [ApmUser.apmReadUserWithoutMlAccess]: {
    roles: [ApmUser.apmReadUserWithoutMlAccess],
  },
  [ApmUser.apmAnnotationsWriteUser]: {
    roles: ['editor', ApmUser.apmAnnotationsWriteUser],
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
