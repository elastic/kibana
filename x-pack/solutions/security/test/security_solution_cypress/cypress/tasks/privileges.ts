/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESS_API_AUTH } from './api_calls/common';

interface User {
  username: string;
  password: string;
  description?: string;
  roles: string[];
}

interface UserInfo {
  username: string;
  full_name: string;
  email: string;
}

interface FeaturesPrivileges {
  [featureId: string]: string[];
}

interface ElasticsearchIndices {
  names: string[];
  privileges: string[];
}

interface ElasticSearchPrivilege {
  cluster?: string[];
  indices?: ElasticsearchIndices[];
}

interface KibanaPrivilege {
  spaces: string[];
  base?: string[];
  feature?: FeaturesPrivileges;
}

interface Role {
  name: string;
  privileges: {
    elasticsearch?: ElasticSearchPrivilege;
    kibana?: KibanaPrivilege[];
  };
}

export const secAll: Role = {
  name: 'sec_all_role',
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
          siemV5: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
          securitySolutionCases: ['all'],
          securitySolutionCasesV2: ['all'],
          securitySolutionCasesV3: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
          securitySolutionSiemMigrations: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllUser: User = {
  username: 'sec_all_user',
  password: 'password',
  roles: [secAll.name],
};

export const secReadCasesAll: Role = {
  name: 'sec_read_cases_all_role',
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
          siemV5: ['read'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
          securitySolutionCases: ['all'],
          securitySolutionCasesV2: ['all'],
          securitySolutionCasesV3: ['all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secReadCasesAllUser: User = {
  username: 'sec_read_cases_all_user',
  password: 'password',
  roles: [secReadCasesAll.name],
};

export const secAllCasesOnlyReadDelete: Role = {
  name: 'sec_all_cases_only_read_delete',
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
          siemV5: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
          securitySolutionCases: ['cases_read', 'cases_delete'],
          securitySolutionCasesV2: ['cases_read', 'cases_delete'],
          securitySolutionCasesV3: ['cases_read', 'cases_delete'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllCasesOnlyReadDeleteUser: User = {
  username: 'sec_all_cases_only_read_delete_user',
  password: 'password',
  roles: [secAllCasesOnlyReadDelete.name],
};

export const secAllCasesNoDelete: Role = {
  name: 'sec_all_cases_no_delete',
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
          siemV5: ['all'],
          securitySolutionTimeline: ['all'],
          securitySolutionNotes: ['all'],
          securitySolutionAssistant: ['all'],
          securitySolutionAttackDiscovery: ['all'],
          securitySolutionCases: ['minimal_all'],
          securitySolutionCasesV2: ['minimal_all'],
          securitySolutionCasesV3: ['minimal_all'],
          actions: ['all'],
          actionsSimulators: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secAllCasesNoDeleteUser: User = {
  username: 'sec_all_cases_no_delete_user',
  password: 'password',
  roles: [secAllCasesNoDelete.name],
};

export const rulesAll: Role = {
  name: 'rules_all_role',
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
          securitySolutionRulesV2: ['all', 'security_solution_exceptions_all'],
          actions: ['all'],
          indexPatterns: ['all'],
          savedObjectManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesAllWithCases: Role = {
  name: 'rules_all_role',
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
          securitySolutionRulesV2: ['all', 'security_solution_exceptions_all'],
          actions: ['all'],
          indexPatterns: ['all'],
          savedObjectManagement: ['all'],
          securitySolutionCasesV3: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesRead: Role = {
  name: 'rules_read_role',
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
          securitySolutionRulesV2: ['read'],
          savedObjectManagement: ['all'],
          indexPatterns: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesAllUser: User = {
  username: 'rules_all_user',
  password: 'password',
  roles: [rulesAll.name],
};

export const rulesAllWithCasesUser: User = {
  username: 'rules_all_with_cases_user',
  password: 'password',
  roles: [rulesAllWithCases.name],
};

export const rulesReadUser: User = {
  username: 'rules_read_user',
  password: 'password',
  roles: [rulesRead.name],
};

const getUserInfo = (user: User): UserInfo => ({
  username: user.username,
  full_name: user.username.replace('_', ' '),
  email: `${user.username}@elastic.co`,
});

export const createUsersAndRoles = (users: User[], roles: Role[]) => {
  for (const role of roles) {
    cy.log(`Creating role: ${JSON.stringify(role)}`);
    cy.request({
      body: role.privileges,
      headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      method: 'PUT',
      auth: ESS_API_AUTH,
      url: `/api/security/role/${role.name}`,
    })
      .its('status')
      .should('eql', 204);
  }

  for (const user of users) {
    const userInfo = getUserInfo(user);
    cy.log(`Creating user: ${JSON.stringify(user)}`);
    cy.request({
      body: {
        username: user.username,
        password: user.password,
        roles: user.roles,
        full_name: userInfo.full_name,
        email: userInfo.email,
      },
      headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      method: 'POST',
      auth: ESS_API_AUTH,
      url: `/internal/security/users/${user.username}`,
    })
      .its('status')
      .should('eql', 200);
  }
};

export const deleteUsersAndRoles = (users: User[], roles: Role[]) => {
  for (const user of users) {
    cy.log(`Deleting user: ${JSON.stringify(user)}`);
    cy.request({
      headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      method: 'DELETE',
      auth: ESS_API_AUTH,
      url: `/internal/security/users/${user.username}`,
      failOnStatusCode: false,
    })
      .its('status')
      .should('oneOf', [204, 404]);
  }

  for (const role of roles) {
    cy.log(`Deleting role: ${JSON.stringify(role)}`);
    cy.request({
      headers: { 'kbn-xsrf': 'cypress-creds', 'x-elastic-internal-origin': 'security-solution' },
      method: 'DELETE',
      auth: ESS_API_AUTH,
      url: `/api/security/role/${role.name}`,
      failOnStatusCode: false,
    })
      .its('status')
      .should('oneOf', [204, 404]);
  }
};
