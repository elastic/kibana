/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AUTHENTICATION = {
  NOT_A_KIBANA_USER: {
    username: 'not_a_kibana_user',
    password: 'password',
    role: 'no_access',
  },
  SUPERUSER: {
    username: 'elastic',
    password: 'changeme',
    role: 'system_indices_superuser',
  },
  KIBANA_LEGACY_USER: {
    username: 'a_kibana_legacy_user',
    password: 'password',
    role: 'kibana_legacy_user',
  },
  KIBANA_DUAL_PRIVILEGES_USER: {
    username: 'a_kibana_dual_privileges_user',
    password: 'password',
    role: 'kibana_dual_privileges_user',
  },
  KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER: {
    username: 'a_kibana_dual_privileges_dashboard_only_user',
    password: 'password',
    role: 'kibana_dual_privileges_dashboard_only_user',
  },
  KIBANA_RBAC_USER: {
    username: 'a_kibana_rbac_user',
    password: 'password',
    role: 'kibana_rbac_user',
  },
  KIBANA_RBAC_DASHBOARD_ONLY_USER: {
    username: 'a_kibana_rbac_dashboard_only_user',
    password: 'password',
    role: 'kibana_rbac_dashboard_only_user',
  },
  KIBANA_RBAC_DEFAULT_SPACE_ALL_USER: {
    username: 'a_kibana_rbac_default_space_all_user',
    password: 'password',
    role: 'kibana_rbac_default_space_all_user',
  },
  KIBANA_RBAC_DEFAULT_SPACE_READ_USER: {
    username: 'a_kibana_rbac_default_space_read_user',
    password: 'password',
    role: 'kibana_rbac_default_space_read_user',
  },
  KIBANA_RBAC_SPACE_1_ALL_USER: {
    username: 'a_kibana_rbac_space_1_all_user',
    password: 'password',
    role: 'kibana_rbac_space_1_all_user',
  },
  KIBANA_RBAC_SPACE_1_READ_USER: {
    username: 'a_kibana_rbac_space_1_read_user',
    password: 'password',
    role: 'kibana_rbac_space_1_read_user',
  },
  KIBANA_RBAC_SPACE_2_ALL_USER: {
    username: 'a_kibana_rbac_space_2_all_user',
    password: 'password',
    role: 'kibana_rbac_space_2_all_user',
  },
  KIBANA_RBAC_SPACE_2_READ_USER: {
    username: 'a_kibana_rbac_space_2_read_user',
    password: 'password',
    role: 'kibana_rbac_space_2_read_user',
  },
  KIBANA_RBAC_SPACE_1_2_ALL_USER: {
    username: 'a_kibana_rbac_space_1_2_all_user',
    password: 'password',
    role: 'kibana_rbac_space_1_2_all_user',
  },
  KIBANA_RBAC_SPACE_1_2_READ_USER: {
    username: 'a_kibana_rbac_space_1_2_read_user',
    password: 'password',
    role: 'kibana_rbac_space_1_2_read_user',
  },
  KIBANA_RBAC_SPACE_3_ALL_USER: {
    username: 'a_kibana_rbac_space_3_all_user',
    password: 'password',
    role: 'kibana_rbac_space_3_all_user',
  },
  KIBANA_RBAC_SPACE_3_READ_USER: {
    username: 'a_kibana_rbac_space_3_read_user',
    password: 'password',
    role: 'kibana_rbac_space_3_read_user',
  },
  KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_ALL_USER: {
    username: 'a_kibana_rbac_default_space_saved_objects_all_user',
    password: 'password',
    role: 'kibana_rbac_default_space_saved_objects_all_user',
  },
  KIBANA_RBAC_DEFAULT_SPACE_SAVED_OBJECTS_READ_USER: {
    username: 'a_kibana_rbac_default_space_saved_objects_read_user',
    password: 'password',
    role: 'kibana_rbac_default_space_saved_objects_read_user',
  },
  KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_ALL_USER: {
    username: 'a_kibana_rbac_space_1_saved_objects_all_user',
    password: 'password',
    role: 'kibana_rbac_space_1_saved_objects_all_user',
  },
  KIBANA_RBAC_SPACE_1_SAVED_OBJECTS_READ_USER: {
    username: 'a_kibana_rbac_space_1_saved_objects_read_user',
    password: 'password',
    role: 'kibana_rbac_space_1_saved_objects_read_user',
  },
  MACHINE_LEARING_ADMIN: {
    username: 'a_machine_learning_admin',
    password: 'password',
    role: 'machine_learning_admin',
  },
  MACHINE_LEARNING_USER: {
    username: 'a_machine_learning_user',
    password: 'password',
    role: 'machine_learning_user',
  },
  MONITORING_USER: {
    username: 'a_monitoring_user',
    password: 'password',
    role: 'monitoring_user',
  },
};

export const ROLES = {
  kibana_legacy_user: {
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['manage', 'read', 'index', 'delete'],
        },
      ],
    },
    kibana: [],
  },
  kibana_dual_privileges_user: {
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['manage', 'read', 'index', 'delete'],
        },
      ],
    },
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
  },
  kibana_dual_privileges_dashboard_only_user: {
    elasticsearch: {
      indices: [
        {
          names: ['.kibana*'],
          privileges: ['read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
  kibana_rbac_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['*'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_dashboard_only_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_default_space_all_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['default'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_default_space_read_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['default'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_all_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['space_1'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_read_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['space_1'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_2_all_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['space_2'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_2_read_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['space_2'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_2_all_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['space_1', 'space_2'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_2_read_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['space_1', 'space_2'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_3_all_user: {
    kibana: [
      {
        base: ['all'],
        spaces: ['space_3'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_3_read_user: {
    kibana: [
      {
        base: ['read'],
        spaces: ['space_3'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_default_space_saved_objects_all_user: {
    kibana: [
      {
        base: [],
        feature: {
          savedObjectsManagement: ['all'],
        },
        spaces: ['default'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_default_space_saved_objects_read_user: {
    kibana: [
      {
        base: [],
        feature: {
          savedObjectsManagement: ['read'],
        },
        spaces: ['default'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_saved_objects_all_user: {
    kibana: [
      {
        base: [],
        feature: {
          savedObjectsManagement: ['all'],
        },
        spaces: ['space_1'],
      },
    ],
    elasticsearch: {},
  },
  kibana_rbac_space_1_saved_objects_read_user: {
    kibana: [
      {
        base: [],
        feature: {
          savedObjectsManagement: ['read'],
        },
        spaces: ['space_1'],
      },
    ],
    elasticsearch: {},
  },
  no_access: {
    kibana: [],
    elasticsearch: {},
  },
};

export const isBuiltInRole = (role: string) =>
  ['admin', 'viewer', 'system_indices_superuser'].includes(role);

export const getRoleDefinitionForUser = (user: { role: string }) =>
  ROLES[user.role as keyof typeof ROLES];
