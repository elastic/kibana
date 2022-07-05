/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from './types';

export const noKibanaPrivileges: Role = {
  name: 'no_kibana_privileges',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
  },
};

export const globalRead: Role = {
  name: 'global_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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

export const securitySolutionOnlyNoDelete: Role = {
  name: 'sec_only_no_delete',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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

export const observabilityOnlyAll: Role = {
  name: 'obs_only_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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

export const casesOnlyDelete: Role = {
  name: 'cases_only_delete',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          generalCases: ['cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const casesNoDelete: Role = {
  name: 'cases_no_delete',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          generalCases: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const casesAll: Role = {
  name: 'cases_all_role',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          generalCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const roles = [
  noKibanaPrivileges,
  globalRead,
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  securitySolutionOnlyDelete,
  securitySolutionOnlyNoDelete,
  observabilityOnlyAll,
  observabilityOnlyRead,
  testDisabledPluginAll,
  casesOnlyDelete,
  casesNoDelete,
  casesAll,
];

/**
 * These roles have access to all spaces.
 */

export const securitySolutionOnlyAllSpacesAll: Role = {
  name: 'sec_only_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
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

export const securitySolutionOnlyReadSpacesAll: Role = {
  name: 'sec_only_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          securitySolutionFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyAllSpacesAll: Role = {
  name: 'obs_only_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          observabilityFixture: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyReadSpacesAll: Role = {
  name: 'obs_only_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          observabilityFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};
