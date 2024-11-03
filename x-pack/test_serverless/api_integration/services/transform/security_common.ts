/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';

import { Client } from '@elastic/elasticsearch';
import {
  TOTAL_INDEX_PRIVILEGE_SET_EDITOR,
  TOTAL_INDEX_PRIVILEGE_SET_VIEWER,
} from '@kbn/slo-plugin/server/services/get_diagnosis';
import { FtrProviderContext } from '../../ftr_provider_context';

export type TransformSecurityCommon = ProvidedType<typeof TransformSecurityCommonProvider>;

export enum USER {
  TRANSFORM_POWERUSER = 'transform_poweruser',
  TRANSFORM_VIEWER = 'transform_viewer',
  TRANSFORM_UNAUTHORIZED = 'transform_unauthorized',
}

export function TransformSecurityCommonProvider({ getService }: FtrProviderContext) {
  const security = getService('security');
  const esClient: Client = getService('es');

  const roles = [
    {
      name: 'transform_source',
      elasticsearch: {
        indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [],
    },
    {
      name: 'transform_dest',
      elasticsearch: {
        indices: [
          { names: ['.slo-observability.*'], privileges: TOTAL_INDEX_PRIVILEGE_SET_EDITOR },
        ],
      },
      kibana: [],
    },
    {
      name: 'transform_dest_readonly',
      elasticsearch: {
        indices: [
          { names: ['.slo-observability.*'], privileges: TOTAL_INDEX_PRIVILEGE_SET_VIEWER },
        ],
      },
      kibana: [],
    },
    {
      name: 'transform_ui_extras',
      elasticsearch: {
        cluster: ['monitor', 'read_pipeline'],
      },
      kibana: [],
    },
  ];

  const users = [
    {
      name: 'transform_poweruser',
      full_name: 'Transform Poweruser',
      password: 'tfp001',
      roles: [
        'kibana_admin',
        'transform_admin',
        'transform_source',
        'transform_dest',
        'transform_ui_extras',
      ],
    },
    {
      name: 'transform_viewer',
      full_name: 'Transform Viewer',
      password: 'tfv001',
      roles: ['kibana_admin', 'transform_user', 'transform_dest_readonly'],
    },
    {
      name: 'transform_unauthorized',
      full_name: 'Transform Unauthorized',
      password: 'tfu001',
      roles: ['kibana_admin'],
    },
  ];

  return {
    async createTransformRoles() {
      for (const role of roles) {
        await security.role.create(role.name, {
          elasticsearch: role.elasticsearch,
          kibana: role.kibana,
        });
      }
    },

    async createTransformUsers() {
      for (const user of users) {
        await security.user.create(user.name, {
          password: user.password,
          roles: user.roles,
          full_name: user.full_name,
        });
      }
    },

    async createApiKeyForTransformUser(username: string) {
      const user = users.find((u) => u.name === username);

      if (user === undefined) {
        throw new Error(`Can't create api key for user ${user} - user not defined`);
      }

      const roleDescriptors = user.roles.reduce<Record<string, object>>((map, roleName) => {
        const userRole = roles.find((r) => r.name === roleName);

        if (userRole) {
          map[roleName] = userRole.elasticsearch;
        }
        return map;
      }, {});
      const apiKey = await esClient.security.createApiKey({
        body: {
          name: `Transform API Key ${user.full_name}`,
          role_descriptors: roleDescriptors,
          metadata: user,
        },
      });
      return { user: { name: user.name as USER, roles: user.roles }, apiKey };
    },

    async createApiKeyForTransformUsers() {
      const apiKeyForTransformUsers = await Promise.all(
        users.map((user) => this.createApiKeyForTransformUser(user.name))
      );

      return apiKeyForTransformUsers;
    },

    async clearAllTransformApiKeys() {
      const existingKeys = await esClient.security.queryApiKeys();

      if (existingKeys.count > 0) {
        await Promise.all(
          existingKeys.api_keys.map(async (key) => {
            await esClient.security.invalidateApiKey({ ids: [key.id] });
          })
        );
      }
    },

    async cleanTransformRoles() {
      for (const role of roles) {
        await security.role.delete(role.name);
      }
    },

    async cleanTransformUsers() {
      for (const user of users) {
        await security.user.delete(user.name);
      }
    },

    getPasswordForUser(user: USER): string {
      const userConfig = users.find((u) => u.name === user);
      if (userConfig === undefined) {
        throw new Error(`Can't log in user ${user} - not defined`);
      }
      return userConfig.password;
    },
  };
}
