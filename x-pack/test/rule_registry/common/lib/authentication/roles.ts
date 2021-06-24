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
          siem: ['read'],
          apm: ['read'],
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
          siem: ['all'],
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
          siem: ['read'],
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
          apm: ['all'],
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
          apm: ['read'],
          actions: ['read'],
          actionsSimulators: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

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
          siem: ['all'],
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
          siem: ['read'],
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
          apm: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyReadSpacesAll: Role = {
  name: 'obs_only_read_all_spaces',
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
          apm: ['read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
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
  observabilityOnlyReadSpacesAll,
];

/**
 * These roles are specifically for the security_only tests where the spaces plugin is disabled. Most of the roles (except
 * for noKibanaPrivileges) have spaces: ['*'] effectively giving it access to the space1 space since no other spaces
 * will exist when the spaces plugin is disabled.
 */
export const rolesDefaultSpace = [
  noKibanaPrivileges,
  globalRead,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
];

/**
 * These roles are only to be used in the 'trial' tests
 * since they rely on subfeature privileges which are a gold licencse feature
 * maybe put these roles into a separate roles file like "trial_roles"?
 */
export const observabilityMinReadAlertsRead: Role = {
  name: 'obs_only_alerts_read',
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
          apm: ['minimal_read', 'alerts_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinReadAlertsReadSpacesAll: Role = {
  name: 'obs_minimal_read_alerts_read_spaces_all',
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
          apm: ['minimal_read', 'alerts_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityMinimalRead: Role = {
  name: 'obs_minimal_read_spaces_all',
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
          apm: ['minimal_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinimalReadSpacesAll: Role = {
  name: 'obs_minimal_read_spaces_all',
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
          apm: ['minimal_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyAlertsRead: Role = {
  name: 'obs_alerts_read_spaces_all',
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
          apm: ['alerts_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyAlertsReadSpacesAll: Role = {
  name: 'obs_alerts_read_spaces_all',
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
          apm: ['alerts_read'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/**
 * ****************************************
 * These are used for testing update alerts privileges
 * ****************************************
 * ****************************************
 * ****************************************
 * ****************************************
 * ****************************************
 * ****************************************
 * ****************************************
 * ****************************************
 */

export const observabilityMinReadAlertsAll: Role = {
  name: 'obs_only_alerts_read',
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
          apm: ['minimal_read', 'alerts_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinReadAlertsAllSpacesAll: Role = {
  name: 'obs_minimal_read_alerts_read_spaces_all',
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
          apm: ['minimal_read', 'alerts_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityMinimalAll: Role = {
  name: 'obs_minimal_read_spaces_all',
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
          apm: ['minimal_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinimalAllSpacesAll: Role = {
  name: 'obs_minimal_read_spaces_all',
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
          apm: ['minimal_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityOnlyAlertsAll: Role = {
  name: 'obs_alerts_read_spaces_all',
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
          apm: ['alerts_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyAlertsAllSpacesAll: Role = {
  name: 'obs_alerts_read_spaces_all',
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
          apm: ['alerts_all'],
          ruleRegistry: ['all'],
          actions: ['read'],
          builtInAlerts: ['all'],
          alerting: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
