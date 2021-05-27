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

export const securitySolutionOnlyAllCasesNone: Role = {
  name: 'sec_only_all_cases_none',
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
        spaces: ['*'],
      },
    ],
  },
};

export const securitySolutionOnlyAllCasesRead: Role = {
  name: 'sec_only_all_cases_read',
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
          securitySolutionFixture: ['minimal_all', 'cases_read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const securitySolutionOnlyReadCasesNone: Role = {
  name: 'sec_only_read_cases_none',
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
          securitySolutionFixture: ['minimal_read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const securitySolutionOnlyReadCasesAll: Role = {
  name: 'sec_only_read_cases_all',
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
          securitySolutionFixture: ['minimal_read', 'cases_all'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
      },
    ],
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

export const globalReadMinimal: Role = {
  name: 'global_read_minimal',
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
          securitySolutionFixture: ['minimal_read', 'cases_read'],
          observabilityFixture: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
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

export const securitySolutionOnlyAllMinimal: Role = {
  name: 'sec_only_all_minimal',
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
          securitySolutionFixture: ['minimal_all', 'cases_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
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

export const securitySolutionOnlyReadMinimal: Role = {
  name: 'sec_only_read_minimal',
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
          securitySolutionFixture: ['minimal_read', 'cases_read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['*'],
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

export const roles = [
  noKibanaPrivileges,
  securitySolutionOnlyAllCasesNone,
  securitySolutionOnlyReadCasesNone,
  securitySolutionOnlyReadCasesAll,
  securitySolutionOnlyAllCasesRead,
  globalRead,
  globalReadMinimal,
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  securitySolutionOnlyAllMinimal,
  securitySolutionOnlyReadMinimal,
  observabilityOnlyAll,
  observabilityOnlyRead,
];

/**
 * These roles have access to all spaces.
 */

export const securitySolutionOnlyAllSpacesAll: Role = {
  name: 'sec_only_all_spaces_all',
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
  name: 'sec_only_read_spaces_all',
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
  name: 'obs_only_all_spaces_all',
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
  name: 'obs_only_read_spaces_all',
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

/**
 * These roles are specifically for the security_only tests where the spaces plugin is disabled. Most of the roles (except
 * for noKibanaPrivileges) have spaces: ['*'] effectively giving it access to the default space since no other spaces
 * will exist when the spaces plugin is disabled.
 */
export const rolesDefaultSpace = [
  noKibanaPrivileges,
  globalRead,
  globalReadMinimal,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
  securitySolutionOnlyReadMinimal,
  securitySolutionOnlyAllMinimal,
  securitySolutionOnlyAllCasesNone,
  securitySolutionOnlyAllCasesRead,
  securitySolutionOnlyReadCasesAll,
  securitySolutionOnlyReadCasesNone,
];
