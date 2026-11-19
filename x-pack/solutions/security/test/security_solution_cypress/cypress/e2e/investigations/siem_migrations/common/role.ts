/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login as loginTask, loginWithUser } from '../../../../tasks/login';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../tasks/privileges';

export const ROLE = {
  roleDescriptor: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
          securitySolutionSiemMigrations: ['all'],
          actions: ['all'],
          workflowsManagement: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
  roleName: 'autoMigrations',
};

/** Same as `ROLE`, without any Workflows privilege */
export const NO_WORKFLOWS_ROLE = {
  roleDescriptor: {
    elasticsearch: ROLE.roleDescriptor.elasticsearch,
    kibana: [
      {
        feature: { siem: ['all'], securitySolutionSiemMigrations: ['all'], actions: ['all'] },
        spaces: ['*'],
      },
    ],
  },
  roleName: 'autoMigrationsNoWorkflows',
};

const NO_WORKFLOWS_ESS_USER = {
  username: NO_WORKFLOWS_ROLE.roleName,
  password: 'password',
  roles: [NO_WORKFLOWS_ROLE.roleName],
};
const NO_WORKFLOWS_ESS_ROLE = {
  name: NO_WORKFLOWS_ROLE.roleName,
  privileges: NO_WORKFLOWS_ROLE.roleDescriptor,
};

export const role = {
  setup: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      cy.task('createServerlessCustomRole', ROLE);
    }
  },
  teardown: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      cy.task('deleteServerlessCustomRole', ROLE.roleName);
    }
  },
  login: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      loginTask(ROLE.roleName);
    } else {
      loginTask();
    }
  },
};

/** Role without Workflows privileges, created as a custom role in serverless and as a user in ESS */
export const noWorkflowsRole = {
  setup: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      cy.task('createServerlessCustomRole', NO_WORKFLOWS_ROLE);
    } else {
      createUsersAndRoles([NO_WORKFLOWS_ESS_USER], [NO_WORKFLOWS_ESS_ROLE]);
    }
  },
  teardown: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      cy.task('deleteServerlessCustomRole', NO_WORKFLOWS_ROLE.roleName);
    } else {
      deleteUsersAndRoles([NO_WORKFLOWS_ESS_USER], [NO_WORKFLOWS_ESS_ROLE]);
    }
  },
  login: () => {
    if (Cypress.env('IS_SERVERLESS')) {
      loginTask(NO_WORKFLOWS_ROLE.roleName);
    } else {
      loginWithUser(NO_WORKFLOWS_ESS_USER);
    }
  },
};
