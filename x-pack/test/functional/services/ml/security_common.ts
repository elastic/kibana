/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

export type MlSecurityCommon = ProvidedType<typeof MachineLearningSecurityCommonProvider>;

export enum USER {
  ML_POWERUSER = 'ft_ml_poweruser',
  ML_POWERUSER_SPACES = 'ft_ml_poweruser_spaces',
  ML_POWERUSER_SPACE1 = 'ft_ml_poweruser_space1',
  ML_POWERUSER_ALL_SPACES = 'ft_ml_poweruser_all_spaces',
  ML_VIEWER = 'ft_ml_viewer',
  ML_VIEWER_SPACES = 'ft_ml_viewer_spaces',
  ML_VIEWER_SPACE1 = 'ft_ml_viewer_space1',
  ML_VIEWER_ALL_SPACES = 'ft_ml_viewer_all_spaces',
  ML_UNAUTHORIZED = 'ft_ml_unauthorized',
}

export function MachineLearningSecurityCommonProvider({ getService }: FtrProviderContext) {
  const security = getService('security');

  const roles = [
    {
      name: 'ft_ml_source',
      elasticsearch: {
        indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [],
    },
    {
      name: 'ft_ml_source_readonly',
      elasticsearch: {
        indices: [{ names: ['*'], privileges: ['read'] }],
      },
      kibana: [],
    },
    {
      name: 'ft_ml_dest',
      elasticsearch: {
        indices: [{ names: ['user-*'], privileges: ['read', 'index', 'manage'] }],
      },
      kibana: [],
    },
    {
      name: 'ft_ml_dest_readonly',
      elasticsearch: {
        indices: [{ names: ['user-*'], privileges: ['read'] }],
      },
      kibana: [],
    },
    {
      name: 'ft_ml_ui_extras',
      elasticsearch: {
        cluster: ['manage_ingest_pipelines'],
      },
      kibana: [],
    },
    {
      name: 'ft_default_space_ml_all',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: [],
          feature: { ml: ['all'], savedObjectsManagement: ['all'] },
          spaces: ['default'],
        },
      ],
    },
    {
      name: 'ft_default_space1_ml_all',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: [],
          feature: { ml: ['all'], savedObjectsManagement: ['all'] },
          spaces: ['default', 'space1'],
        },
      ],
    },
    {
      name: 'ft_all_spaces_ml_all',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: ['all'],
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'ft_default_space_ml_read',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: [],
          feature: { ml: ['read'], savedObjectsManagement: ['read'] },
          spaces: ['default'],
        },
      ],
    },
    {
      name: 'ft_default_space1_ml_read',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: [],
          feature: { ml: ['read'], savedObjectsManagement: ['read'] },
          spaces: ['default', 'space1'],
        },
      ],
    },
    {
      name: 'ft_all_spaces_ml_read',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: ['read'],
          spaces: ['*'],
        },
      ],
    },
    {
      name: 'ft_default_space_ml_none',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['default'] }],
    },
    {
      name: 'ft_all_space_ml_none',
      elasticsearch: { cluster: [], indices: [], run_as: [] },
      kibana: [
        {
          base: [],
          // This role is intended to be used by the "ft_ml_poweruser" and "ft_ml_viewer" users; they should have access to ML by virtue of
          // the "machine_learning_admin" and "machine_learning_user" roles. However, a user needs _at least_ one Kibana privilege to log
          // into Kibana. This role allows these users to log in, but explicitly omits ML from the feature privileges.
          // In addition: several functional tests that use these users also rely on UI elements that are enabled by other Kibana features,
          // such as "View in Lens", "Add to Dashboard", and creating anomaly detection rules. These feature privileges are the minimal ones
          // necessary to satisfy all of those functional tests.
          feature: {
            // FIXME: We need permission to save search in Discover to test the data viz embeddable
            // change permission back to read once tests are moved out of ML
            discover: ['all'],
            visualize: ['read'],
            dashboard: ['all'],
            actions: ['all'],
            savedObjectsManagement: ['all'],
            advancedSettings: ['all'],
            indexPatterns: ['all'],
          },
          spaces: ['*'],
        },
      ],
    },
  ];

  const users = [
    {
      name: 'ft_ml_poweruser',
      full_name: 'ML Poweruser',
      password: 'mlp001',
      roles: [
        'ft_all_space_ml_none',
        'machine_learning_admin',
        'ft_ml_source',
        'ft_ml_dest',
        'ft_ml_ui_extras',
      ],
    },
    {
      name: 'ft_ml_poweruser_spaces',
      full_name: 'ML Poweruser',
      password: 'mlps001',
      roles: ['ft_default_space_ml_all', 'ft_ml_source', 'ft_ml_dest', 'ft_ml_ui_extras'],
    },
    {
      name: 'ft_ml_poweruser_space1',
      full_name: 'ML Poweruser',
      password: 'mlps1001',
      roles: ['ft_default_space1_ml_all', 'ft_ml_source', 'ft_ml_dest', 'ft_ml_ui_extras'],
    },
    {
      name: 'ft_ml_poweruser_all_spaces',
      full_name: 'ML Poweruser',
      password: 'mlpas001',
      roles: ['ft_all_spaces_ml_all', 'ft_ml_source', 'ft_ml_dest', 'ft_ml_ui_extras'],
    },
    {
      name: 'ft_ml_viewer',
      full_name: 'ML Viewer',
      password: 'mlv001',
      roles: [
        'ft_all_space_ml_none',
        'machine_learning_user',
        'ft_ml_source_readonly',
        'ft_ml_dest_readonly',
      ],
    },
    {
      name: 'ft_ml_viewer_spaces',
      full_name: 'ML Viewer',
      password: 'mlvs001',
      roles: ['ft_default_space_ml_read', 'ft_ml_source_readonly', 'ft_ml_dest_readonly'],
    },
    {
      name: 'ft_ml_viewer_space1',
      full_name: 'ML Viewer',
      password: 'mlvs1001',
      roles: ['ft_default_space1_ml_read', 'ft_ml_source_readonly', 'ft_ml_dest_readonly'],
    },
    {
      name: 'ft_ml_viewer_all_spaces',
      full_name: 'ML Viewer',
      password: 'mlvs1001',
      roles: ['ft_all_spaces_ml_read', 'ft_ml_source_readonly', 'ft_ml_dest_readonly'],
    },
    {
      name: 'ft_ml_unauthorized',
      full_name: 'ML Unauthorized',
      password: 'mlu001',
      roles: ['ft_default_space_ml_none', 'ft_ml_source_readonly'],
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
