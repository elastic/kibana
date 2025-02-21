/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Role } from '../../../../cases_api_integration/common/lib/authentication/types';

/**
 * Roles for Cases in Security Solution
 */

export const secAllCasesOnlyDelete: Role = {
  name: 'sec_all_cases_only_delete_api_int',
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
          securitySolutionCases: ['cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllCasesOnlyReadDelete: Role = {
  name: 'sec_all_cases_only_read_delete_api_int',
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
          securitySolutionCases: ['read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllCasesNoDelete: Role = {
  name: 'sec_all_cases_no_delete_api_int',
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
          securitySolutionCases: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAll: Role = {
  name: 'sec_all_role_api_int',
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
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secCasesV2All: Role = {
  name: 'sec_cases_v2_all_role_api_int',
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
          securitySolutionCasesV2: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secCasesV3All: Role = {
  name: 'sec_cases_v3_all_role_api_int',
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
          securitySolutionCasesV3: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secCasesV2NoReopenWithCreateComment: Role = {
  name: 'sec_cases_v2_no_reopen_role_api_int',
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
          securitySolutionCasesV2: ['read', 'update', 'create', 'cases_delete', 'create_comment'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secCasesV2NoCreateCommentWithReopen: Role = {
  name: 'sec_cases_v2_create_comment_no_reopen_role_api_int',
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
          securitySolutionCasesV2: ['read', 'update', 'create', 'delete', 'case_reopen'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllSpace1: Role = {
  name: 'sec_all_role_space1_api_int',
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
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['space1'],
      },
    ],
  },
};

export const secAllCasesRead: Role = {
  name: 'sec_all_cases_read_role_api_int',
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
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllCasesNone: Role = {
  name: 'sec_all_cases_none_role_api_int',
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

export const secReadCasesAll: Role = {
  name: 'sec_read_cases_all_role_api_int',
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
          securitySolutionCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secReadCasesRead: Role = {
  name: 'sec_read_cases_read_role_api_int',
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
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secRead: Role = {
  name: 'sec_read_role_api_int',
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
          securitySolutionCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secReadCasesNone: Role = {
  name: 'sec_read_cases_none_role_api_int',
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
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/**
 * Roles for Cases in the stack
 */

export const casesOnlyDelete: Role = {
  name: 'cases_only_delete_api_int',
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
        spaces: ['*'],
      },
    ],
  },
};

export const casesOnlyReadDelete: Role = {
  name: 'cases_only_read_delete_api_int',
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
          generalCases: ['read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const casesNoDelete: Role = {
  name: 'cases_no_delete_api_int',
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
        spaces: ['*'],
      },
    ],
  },
};

export const casesAll: Role = {
  name: 'cases_all_role_api_int',
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
        spaces: ['*'],
      },
    ],
  },
};

export const casesV2All: Role = {
  name: 'cases_v2_all_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV2: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesV3All: Role = {
  name: 'cases_v3_all_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV3: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesV3NoAssignee: Role = {
  name: 'cases_v3_no_assignee_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV3: ['minimal_read', 'cases_delete', 'case_reopen', 'create_comment'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesV3ReadAndAssignee: Role = {
  name: 'cases_v3_read_assignee_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV3: ['minimal_read', 'cases_assign'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesV2NoReopenWithCreateComment: Role = {
  name: 'cases_v2_no_reopen_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV2: ['read', 'update', 'create', 'cases_delete', 'create_comment'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesV2NoCreateCommentWithReopen: Role = {
  name: 'cases_v2_no_create_comment_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          generalCasesV2: ['read', 'update', 'create', 'cases_delete', 'case_reopen'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const casesRead: Role = {
  name: 'cases_read_role_api_int',
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
          generalCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

/**
 * Roles for Cases in Observability
 */

export const obsCasesOnlyDelete: Role = {
  name: 'obs_cases_only_delete_api_int',
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
          observabilityCases: ['cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obsCasesOnlyReadDelete: Role = {
  name: 'obs_cases_only_read_delete_api_int',
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
          observabilityCases: ['read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obsCasesNoDelete: Role = {
  name: 'obs_cases_no_delete_api_int',
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
          observabilityCases: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obsCasesAll: Role = {
  name: 'obs_cases_all_role_api_int',
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
          observabilityCases: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const obsCasesV2All: Role = {
  name: 'obs_cases_v2_all_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          observabilityCasesV2: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const obsCasesV3All: Role = {
  name: 'obs_cases_v3_all_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          observabilityCasesV3: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const obsCasesV2NoReopenWithCreateComment: Role = {
  name: 'obs_cases_v2_no_reopen_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          observabilityCasesV2: [
            'read',
            'cases_update',
            'create',
            'cases_delete',
            'create_comment',
          ],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const obsCasesV2NoCreateCommentWithReopen: Role = {
  name: 'obs_cases_v2_no_create_comment_role_api_int',
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
        spaces: ['*'],
        base: [],
        feature: {
          observabilityCasesV2: ['read', 'update', 'create', 'cases_delete', 'case_reopen'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
      },
    ],
  },
};

export const obsCasesRead: Role = {
  name: 'obs_cases_read_role_api_int',
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
          observabilityCases: ['read'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles = [
  secAllCasesOnlyDelete,
  secAllCasesOnlyReadDelete,
  secAllCasesNoDelete,
  secAll,
  secCasesV2All,
  secCasesV3All,
  secCasesV2NoReopenWithCreateComment,
  secCasesV2NoCreateCommentWithReopen,
  secAllSpace1,
  secAllCasesRead,
  secAllCasesNone,
  secReadCasesAll,
  secReadCasesRead,
  secReadCasesNone,
  secRead,
  casesOnlyDelete,
  casesOnlyReadDelete,
  casesNoDelete,
  casesAll,
  casesV2All,
  casesV3All,
  casesV3NoAssignee,
  casesV3ReadAndAssignee,
  casesV2NoReopenWithCreateComment,
  casesV2NoCreateCommentWithReopen,
  casesRead,
  obsCasesOnlyDelete,
  obsCasesOnlyReadDelete,
  obsCasesNoDelete,
  obsCasesAll,
  obsCasesV2All,
  obsCasesV3All,
  obsCasesV2NoReopenWithCreateComment,
  obsCasesV2NoCreateCommentWithReopen,
  obsCasesRead,
];
