/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from './types';

const defaultElasticsearchPrivileges = {
  elasticsearch: {
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
      },
    ],
  },
};

export const noKibanaPrivileges: Role = {
  name: 'no_kibana_privileges',
  privileges: {
    ...defaultElasticsearchPrivileges,
  },
};

export const noCasesPrivilegesSpace1: Role = {
  name: 'no_cases_kibana_privileges',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const noCasesConnectors: Role = {
  name: 'no_cases_connectors',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          testNoCasesConnectorFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const globalRead: Role = {
  name: 'global_read',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['read'],
          observabilityFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const testDisabledPluginAll: Role = {
  name: 'test_disabled_plugin_all',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          testDisabledFixtureID: ['all'],
          securitySolutionFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyAll: Role = {
  name: 'sec_only_all',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyDelete: Role = {
  name: 'sec_only_delete',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyReadDelete: Role = {
  name: 'sec_only_read_delete',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['minimal_read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyNoDelete: Role = {
  name: 'sec_only_no_delete',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyCreateComment: Role = {
  name: 'sec_only_create_comment',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['create_comment'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyReadCreateComment: Role = {
  name: 'sec_only_read_create_comment',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['minimal_read', 'create_comment'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyNoCreateComment: Role = {
  name: 'sec_only_no_create_comment',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyRead: Role = {
  name: 'sec_only_read',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyReadAlerts: Role = {
  name: 'sec_only_read_alerts',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          siem: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyReadNoIndexAlerts: Role = {
  name: 'sec_only_read_no_index_alerts',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          siem: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyAll: Role = {
  name: 'obs_only_all',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          observabilityFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyRead: Role = {
  name: 'obs_only_read',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          observabilityFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyReadAlerts: Role = {
  name: 'obs_only_read_alerts',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          observabilityFixture: ['all'],
          apm: ['read'],
          logs: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

/**
 * These roles have access to all spaces.
 */

export const securitySolutionOnlyAllSpacesRole: Role = {
  name: 'sec_only_all_spaces',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const onlyActions: Role = {
  name: 'only_actions',
  privileges: {
    ...defaultElasticsearchPrivileges,
    kibana: [
      {
        feature: {
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles = [
  noKibanaPrivileges,
  noCasesPrivilegesSpace1,
  noCasesConnectors,
  globalRead,
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  securitySolutionOnlyReadAlerts,
  securitySolutionOnlyDelete,
  securitySolutionOnlyReadDelete,
  securitySolutionOnlyNoDelete,
  securitySolutionOnlyCreateComment,
  securitySolutionOnlyReadCreateComment,
  securitySolutionOnlyNoCreateComment,
  observabilityOnlyAll,
  observabilityOnlyRead,
  observabilityOnlyReadAlerts,
  testDisabledPluginAll,
  securitySolutionOnlyReadNoIndexAlerts,
  onlyActions,
];
