/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login as loginTask } from '../../../../tasks/login';

export const ROLE = {
  roleDescriptor: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: { siem: ['all'], securitySolutionSiemMigrations: ['all'], actions: ['all'] },
        spaces: ['*'],
      },
    ],
  },
  roleName: 'autoMigrations',
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
