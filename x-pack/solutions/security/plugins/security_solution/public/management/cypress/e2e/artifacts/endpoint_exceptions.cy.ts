/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import { login, ROLE } from '../../tasks/login';

describe(
  'Endpoint exceptions - from Security Management/Assets',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'endpointExceptionsMovedUnderManagement',
          ])}`,
        ],
      },
    },
  },

  () => {
    describe('ESS', { tags: ['@ess'] }, () => {
      it('should display Endpoint Exceptions in Administration page', () => {
        login(ROLE.t1_analyst);

        cy.visit('app/security/manage');
        cy.getByTestSubj('pageContainer').contains('Endpoint exceptions');
      });

      it('should display Endpoint Exceptions in Manage side panel', () => {
        login(ROLE.t1_analyst);

        cy.visit('app/security');

        essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ENDPOINT_EXCEPTIONS);
        cy.get(essSecurityHeaders.ENDPOINT_EXCEPTIONS).should('exist');
      });

      // todo: add 'should NOT' test case when Endpoint Exceptions sub-feature privilege is separated from Security
    });

    describe('Serverless', { tags: ['@serverless', '@skipInServerlessMKI'] }, () => {
      it('should display Endpoint Exceptions in Assets side panel ', () => {
        login(ROLE.t1_analyst);

        cy.visit('app/security');

        serverlessSecurityHeaders.openNavigationPanelFor(
          serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS
        );
        cy.get(serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS).should('exist');
      });

      // todo: add 'should NOT' test case when custom roles are available on serverless
    });
  }
);
