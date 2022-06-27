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

export const roles = [
  noKibanaPrivileges,
  globalRead,
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  observabilityOnlyAll,
  observabilityOnlyRead,
  testDisabledPluginAll,
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
