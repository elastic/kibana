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
      indices: [],
    },
  },
};

export const globalRead: Role = {
  name: 'global_read',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        base: ['read'],
        spaces: ['*'],
      },
    ],
  },
};

export const securitySolutionOnlyAll: Role = {
  name: 'sec_only_all_spaces_space1',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyAllSpace2: Role = {
  name: 'sec_only_all_spaces_space2',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['space2'],
      },
    ],
  },
};

export const securitySolutionOnlyRead: Role = {
  name: 'sec_only_read_spaces_space1',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const securitySolutionOnlyReadSpace2: Role = {
  name: 'sec_only_read_spaces_space2',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
        },
        spaces: ['space2'],
      },
    ],
  },
};

export const observabilityOnlyAll: Role = {
  name: 'obs_only_all_spaces_space1',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyAllSpace2: Role = {
  name: 'obs_only_all_spaces_space2',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['all'],
        },
        spaces: ['space2'],
      },
    ],
  },
};

export const observabilityOnlyRead: Role = {
  name: 'obs_only_read_spaces_space1',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['read'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityOnlyReadSpace2: Role = {
  name: 'obs_only_read_spaces_space2',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['read'],
        },
        spaces: ['space2'],
      },
    ],
  },
};

/**
 * These roles have access to all spaces.
 */
export const securitySolutionOnlyAllSpacesAll: Role = {
  name: 'sec_only_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
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
      indices: [],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
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
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const logsOnlyAllSpacesAll: Role = {
  name: 'logs_only_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          logs: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/**
 * This role exists to test that the alert search strategy allows
 * users who do not have access to security solutions the ability
 * to see security solutions alerts. This is because security solutions
 * does not properly leverage RBAC and we filter out the RBAC when
 * searching for security solution alerts in the alert search strategy.
 */
export const observabilityOnlyAllSpacesAllWithReadESIndices: Role = {
  name: 'obs_only_all_spaces_all_with_read_es_indices',
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
        },
        spaces: ['default', 'space1'],
      },
    ],
  },
};

export const observabilityOnlyReadSpacesAll: Role = {
  name: 'obs_only_read_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['read'],
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
  observabilityOnlyAllSpacesAllWithReadESIndices,
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
      indices: [],
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
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_read', 'alerts_read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityMinimalRead: Role = {
  name: 'obs_minimal_read',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_read'],
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
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_read'],
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
  name: 'obs_only_alerts_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_read', 'alerts_all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinReadAlertsAllSpacesAll: Role = {
  name: 'obs_minimal_read_alerts_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_read', 'alerts_all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const observabilityMinimalAll: Role = {
  name: 'obs_minimal_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const observabilityMinimalAllSpacesAll: Role = {
  name: 'obs_minimal_all_spaces_all',
  privileges: {
    elasticsearch: {
      indices: [],
    },
    kibana: [
      {
        feature: {
          apm: ['minimal_all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const allRoles = [
  noKibanaPrivileges,
  globalRead,
  securitySolutionOnlyAll,
  securitySolutionOnlyRead,
  observabilityOnlyAll,
  observabilityOnlyRead,
  securitySolutionOnlyAllSpacesAll,
  securitySolutionOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAll,
  logsOnlyAllSpacesAll,
  observabilityOnlyReadSpacesAll,
  observabilityOnlyAllSpacesAllWithReadESIndices,
  observabilityMinReadAlertsRead,
  observabilityMinReadAlertsReadSpacesAll,
  observabilityMinimalRead,
  observabilityMinimalReadSpacesAll,
  observabilityMinReadAlertsAll,
  observabilityMinReadAlertsAllSpacesAll,
  observabilityMinimalAll,
  observabilityMinimalAllSpacesAll,
  securitySolutionOnlyAllSpace2,
  securitySolutionOnlyReadSpace2,
  observabilityOnlyAllSpace2,
  observabilityOnlyReadSpace2,
];
