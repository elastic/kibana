/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROLES = {
  KIBANA_RBAC_DEFAULT_SPACE_READ_USER: {
    name: 'kibana_rbac_default_space_read_user',
    privileges: {
      kibana: [
        {
          base: ['read'],
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_WRITE_USER: {
    name: 'kibana_rbac_default_space_write_user',
    privileges: {
      kibana: [
        {
          base: ['all'],
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER: {
    name: 'kibana_rbac_default_space_so_management_write_user',
    privileges: {
      kibana: [
        {
          feature: {
            savedObjectsManagement: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_SO_MANAGEMENT_READ_USER: {
    name: 'kibana_rbac_default_space_so_management_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            savedObjectsManagement: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_SO_TAGGING_READ_USER: {
    name: 'kibana_rbac_default_space_so_tagging_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            savedObjectsTagging: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_SO_TAGGING_WRITE_USER: {
    name: 'kibana_rbac_default_space_so_tagging_write_user',
    privileges: {
      kibana: [
        {
          feature: {
            savedObjectsTagging: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_DASHBOARD_READ_USER: {
    name: 'kibana_rbac_default_space_dashboard_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            dashboard: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_DASHBOARD_WRITE_USER: {
    name: 'kibana_rbac_default_space_dashboard_write_user',
    privileges: {
      kibana: [
        {
          feature: {
            dashboard: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_VISUALIZE_READ_USER: {
    name: 'kibana_rbac_default_space_visualize_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            visualize: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_VISUALIZE_WRITE_USER: {
    name: 'kibana_rbac_default_space_visualize_write_user',
    privileges: {
      kibana: [
        {
          feature: {
            visualize: ['all'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER: {
    name: 'kibana_rbac_default_space_advanced_settings_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            advancedSettings: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
  KIBANA_RBAC_DEFAULT_SPACE_MAPS_READ_USER: {
    name: 'kibana_rbac_default_space_maps_read_user',
    privileges: {
      kibana: [
        {
          feature: {
            maps: ['read'],
          },
          spaces: ['default'],
        },
      ],
    },
  },
};

export const USERS = {
  NOT_A_KIBANA_USER: {
    username: 'not_a_kibana_user',
    password: 'password',
    roles: [],
    description: 'user with no access',
  },
  SUPERUSER: {
    username: 'elastic',
    password: 'changeme',
    roles: [],
    superuser: true,
    description: 'superuser',
  },
  DEFAULT_SPACE_READ_USER: {
    username: 'a_kibana_rbac_default_space_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_READ_USER.name],
    description: 'rbac user with read on default space',
  },
  DEFAULT_SPACE_WRITE_USER: {
    username: 'a_kibana_rbac_default_space_write_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_WRITE_USER.name],
    description: 'rbac user with all on default space',
  },
  DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER: {
    username: 'a_kibana_rbac_default_space_so_management_write_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER.name],
    description: 'rbac user with all on SO management on default space',
  },
  DEFAULT_SPACE_SO_TAGGING_READ_USER: {
    username: 'a_kibana_rbac_default_space_so_tagging_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_SO_TAGGING_READ_USER.name],
  },
  DEFAULT_SPACE_SO_TAGGING_READ_SO_MANAGEMENT_READ_USER: {
    username: 'a_kibana_rbac_default_space_so_tagging_read_so_management_read_user',
    password: 'password',
    roles: [
      ROLES.KIBANA_RBAC_DEFAULT_SPACE_SO_TAGGING_READ_USER.name,
      ROLES.KIBANA_RBAC_DEFAULT_SPACE_SO_MANAGEMENT_READ_USER.name,
    ],
  },
  DEFAULT_SPACE_SO_TAGGING_WRITE_USER: {
    username: 'a_kibana_rbac_default_space_so_tagging_write_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_SO_TAGGING_WRITE_USER.name],
  },
  DEFAULT_SPACE_DASHBOARD_READ_USER: {
    username: 'a_kibana_rbac_default_space_dashboard_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_DASHBOARD_READ_USER.name],
  },
  DEFAULT_SPACE_VISUALIZE_READ_USER: {
    username: 'a_kibana_rbac_default_space_visualize_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_VISUALIZE_READ_USER.name],
  },
  DEFAULT_SPACE_DASHBOARD_WRITE_USER: {
    username: 'a_kibana_rbac_default_space_dashboard_write_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_DASHBOARD_WRITE_USER.name],
  },
  DEFAULT_SPACE_VISUALIZE_WRITE_USER: {
    username: 'a_kibana_rbac_default_space_visualize_write_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_VISUALIZE_WRITE_USER.name],
  },
  DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER: {
    username: 'a_kibana_rbac_default_space_advanced_settings_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER.name],
  },
  DEFAULT_SPACE_MAPS_READ_USER: {
    username: 'a_kibana_rbac_default_space_maps_read_user',
    password: 'password',
    roles: [ROLES.KIBANA_RBAC_DEFAULT_SPACE_MAPS_READ_USER.name],
  },
};
