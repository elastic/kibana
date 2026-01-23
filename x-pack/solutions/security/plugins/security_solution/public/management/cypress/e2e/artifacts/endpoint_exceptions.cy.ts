/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import {
  APP_MANAGE_PATH,
  APP_PATH,
  RULES_FEATURE_ID,
  SECURITY_FEATURE_ID,
} from '../../../../../common/constants';
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
      const loginWithReadAccess = () => {
        login.withCustomKibanaPrivileges({
          [SECURITY_FEATURE_ID]: ['read', 'endpoint_exceptions_read'],
          [RULES_FEATURE_ID]: ['read'],
        });
      };

      it('should display Endpoint Exceptions in Administration page', () => {
        loginWithReadAccess();

        cy.visit(APP_MANAGE_PATH);
        cy.getByTestSubj('pageContainer').contains('Endpoint exceptions');
      });

      it('should be able to navigate to Endpoint Exceptions from Administration page', () => {
        loginWithReadAccess();
        cy.visit(APP_MANAGE_PATH);
        cy.getByTestSubj('pageContainer').contains('Endpoint exceptions').click();

        cy.getByTestSubj('endpointExceptionsListPage-container').should('exist');
      });

      it('should display Endpoint Exceptions in Manage side panel', () => {
        loginWithReadAccess();

        cy.visit(APP_PATH);

        essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ENDPOINT_EXCEPTIONS);
        cy.get(essSecurityHeaders.ENDPOINT_EXCEPTIONS).should('exist');
      });

      it('should be able to navigate to Endpoint Exceptions from Manage side panel', () => {
        loginWithReadAccess();
        cy.visit(APP_PATH);

        essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ENDPOINT_EXCEPTIONS);
        cy.get(essSecurityHeaders.ENDPOINT_EXCEPTIONS).click();

        cy.getByTestSubj('endpointExceptionsListPage-container').should('exist');
      });

      // todo: add 'should NOT' test case when Endpoint Exceptions sub-feature privilege is separated from Security
    });

    describe('Serverless', { tags: ['@serverless', '@skipInServerlessMKI'] }, () => {
      it('should display Endpoint Exceptions in Assets side panel ', () => {
        // testing with t3_analyst with WRITE access, as we don't support custom roles on serverless yet
        login(ROLE.t3_analyst);

        cy.visit(APP_PATH);

        serverlessSecurityHeaders.showMoreItems();
        serverlessSecurityHeaders.openNavigationPanelFor(
          serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS
        );
        cy.get(serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS).should('exist');
      });

      // todo: add 'should NOT' test case when custom roles are available on serverless
    });
  }
);
