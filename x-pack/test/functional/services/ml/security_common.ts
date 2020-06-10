/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProvidedType } from '@kbn/test/types/ftr';

import { FtrProviderContext } from '../../ftr_provider_context';

export type MlSecurityCommon = ProvidedType<typeof MachineLearningSecurityCommonProvider>;

export enum USER {
  ML_POWERUSER = 'ml_poweruser',
  ML_VIEWER = 'ml_viewer',
  ML_UNAUTHORIZED = 'ml_unauthorized',
}

export function MachineLearningSecurityCommonProvider({ getService }: FtrProviderContext) {
  const security = getService('security');

  const roles = [
    {
      name: 'ml_source',
      elasticsearch: {
        indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [],
    },
    {
      name: 'ml_dest',
      elasticsearch: {
        indices: [{ names: ['user-*'], privileges: ['read', 'index', 'manage'] }],
      },
      kibana: [],
    },
    {
      name: 'ml_dest_readonly',
      elasticsearch: {
        indices: [{ names: ['user-*'], privileges: ['read'] }],
      },
      kibana: [],
    },
    {
      name: 'ml_ui_extras',
      elasticsearch: {
        cluster: ['manage_ingest_pipelines', 'monitor'],
      },
      kibana: [],
    },
  ];

  const users = [
    {
      name: 'ml_poweruser',
      full_name: 'ML Poweruser',
      password: 'mlp001',
      roles: ['kibana_admin', 'machine_learning_admin', 'ml_source', 'ml_dest', 'ml_ui_extras'],
    },
    {
      name: 'ml_viewer',
      full_name: 'ML Viewer',
      password: 'mlv001',
      roles: ['kibana_admin', 'machine_learning_user', 'ml_source', 'ml_dest_readonly'],
    },
    {
      name: 'ml_unauthorized',
      full_name: 'ML Unauthorized',
      password: 'mlu001',
      roles: ['kibana_admin', 'ml_source'],
    },
  ];

  return {
    async createMlRoles() {
      for (const role of roles) {
        await security.role.create(role.name, {
          elasticsearch: role.elasticsearch,
          kibana: role.kibana,
        });
      }
    },

    async createMlUsers() {
      for (const user of users) {
        await security.user.create(user.name, {
          password: user.password,
          roles: user.roles,
          full_name: user.full_name,
        });
      }
    },

    async cleanMlRoles() {
      for (const role of roles) {
        await security.role.delete(role.name);
      }
    },

    async cleanMlUsers() {
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
