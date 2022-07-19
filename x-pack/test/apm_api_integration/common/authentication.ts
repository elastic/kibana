/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { PrivilegeType } from '@kbn/apm-plugin/common/privilege_type';
import { ToolingLog } from '@kbn/tooling-log';
import { omit } from 'lodash';
import { KbnClientRequesterError } from '@kbn/test';
import { AxiosError } from 'axios';
import { SecurityServiceProvider } from '../../../../test/common/services/security';

type SecurityService = Awaited<ReturnType<typeof SecurityServiceProvider>>;

export enum ApmUsername {
  noAccessUser = 'no_access_user',
  viewerUser = 'viewer',
  editorUser = 'editor',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
}

export enum ApmCustomRolename {
  apmReadUserWithoutMlAccess = 'apm_read_user_without_ml_access',
  apmAnnotationsWriteUser = 'apm_annotations_write_user',
  apmManageOwnAgentKeys = 'apm_manage_own_agent_keys',
  apmManageOwnAndCreateAgentKeys = 'apm_manage_own_and_create_agent_keys',
}

const customRoles = {
  [ApmCustomRolename.apmReadUserWithoutMlAccess]: {
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
  [ApmCustomRolename.apmAnnotationsWriteUser]: {
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
  [ApmCustomRolename.apmManageOwnAgentKeys]: {
    elasticsearch: {
      cluster: ['manage_own_api_key'],
    },
  },
  [ApmCustomRolename.apmManageOwnAndCreateAgentKeys]: {
    applications: [
      {
        application: 'apm',
        privileges: [PrivilegeType.AGENT_CONFIG, PrivilegeType.EVENT, PrivilegeType.SOURCEMAP],
        resources: ['*'],
      },
    ],
  },
};

const users: Record<
  ApmUsername,
  { builtInRoleNames?: string[]; customRoleNames?: ApmCustomRolename[] }
> = {
  [ApmUsername.noAccessUser]: {},
  [ApmUsername.viewerUser]: {
    builtInRoleNames: ['viewer'],
  },
  [ApmUsername.editorUser]: {
    builtInRoleNames: ['editor'],
  },
  [ApmUsername.apmReadUserWithoutMlAccess]: {
    customRoleNames: [ApmCustomRolename.apmReadUserWithoutMlAccess],
  },
  [ApmUsername.apmAnnotationsWriteUser]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ApmCustomRolename.apmAnnotationsWriteUser],
  },
  [ApmUsername.apmManageOwnAgentKeys]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [ApmCustomRolename.apmManageOwnAgentKeys],
  },
  [ApmUsername.apmManageOwnAndCreateAgentKeys]: {
    builtInRoleNames: ['editor'],
    customRoleNames: [
      ApmCustomRolename.apmManageOwnAgentKeys,
      ApmCustomRolename.apmManageOwnAndCreateAgentKeys,
    ],
  },
};

function logErrorResponse(logger: ToolingLog, e: Error) {
  if (e instanceof KbnClientRequesterError) {
    logger.error(`KbnClientRequesterError: ${JSON.stringify(e.axiosError?.response?.data)}`);
  } else if (e instanceof AxiosError) {
    logger.error(`AxiosError: ${JSON.stringify(e.response?.data)}`);
  } else {
    logger.error(`Unknown error: ${e.constructor.name}`);
  }
}

export async function createApmUser({
  username,
  security,
  es,
  logger,
}: {
  username: ApmUsername;
  security: SecurityService;
  es: Client;
  logger: ToolingLog;
}) {
  const user = users[username];

  if (!user) {
    throw new Error(`No configuration found for ${username}`);
  }

  const { builtInRoleNames = [], customRoleNames = [] } = user;

  try {
    // create custom roles
    await Promise.all(
      customRoleNames.map(async (roleName) => createCustomRole({ roleName, security, es }))
    );

    // create user
    await security.user.create(username, {
      full_name: username,
      password: APM_TEST_PASSWORD,
      roles: [...builtInRoleNames, ...customRoleNames],
    });
  } catch (e) {
    logErrorResponse(logger, e);
    throw e;
  }
}

async function createCustomRole({
  roleName,
  security,
  es,
}: {
  roleName: ApmCustomRolename;
  security: SecurityService;
  es: Client;
}) {
  const role = customRoles[roleName];

  // Add application privileges with es client as they are not supported by
  // security.user.create. They are preserved when updating the role below
  if ('applications' in role) {
    await es.security.putRole({ name: roleName, body: role });
  }
  await security.role.create(roleName, omit(role, 'applications'));
}

export const APM_TEST_PASSWORD = 'changeme';
