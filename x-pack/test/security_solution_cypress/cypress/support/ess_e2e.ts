/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './commands';
import 'cypress-real-events/support';
import registerCypressGrep from '@cypress/grep';
import serverlessRoleDefinitions from '@kbn/es/src/serverless_resources/security_roles.json';
import essRoleDefinitions from '@kbn/security-solution-plugin/common/test/ess_roles.json';
import { setupUsers } from './setup_users';

before(() => {
  cy.task('esArchiverLoad', { archiveName: 'auditbeat' });
});

// Create Serverless and ESS roles and corresponding users. This helps to seamlessly reuse tests
// between ESS and Serverless having all the necessary users set up.
before(() => {
  const allSupportedRoles = [
    ...Object.keys(serverlessRoleDefinitions).map((serverlessRoleName) => ({
      name: serverlessRoleName,
      ...serverlessRoleDefinitions[serverlessRoleName as keyof typeof serverlessRoleDefinitions],
    })),
    ...Object.keys(essRoleDefinitions).map((essRoleName) => ({
      name: essRoleName,
      ...essRoleDefinitions[essRoleName as keyof typeof essRoleDefinitions],
    })),
  ];

  setupUsers(allSupportedRoles);
});

registerCypressGrep();

Cypress.on('uncaught:exception', () => {
  return false;
});
