/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import {
  APP_ENDPOINT_EXCEPTIONS_PATH,
  APP_PATH,
  RULES_FEATURE_ID,
  SECURITY_FEATURE_ID,
} from '../../../../../common/constants';
import { login, ROLE } from '../../tasks/login';

describe('Endpoint exceptions - preserving behaviour without `endpointExceptionsMovedUnderManagement` feature flag', () => {
  describe('ESS', { tags: ['@ess'] }, () => {
    const loginWithReadAccess = () => {
      login.withCustomKibanaPrivileges({
        [SECURITY_FEATURE_ID]: ['read', 'endpoint_exceptions_read'],
        [RULES_FEATURE_ID]: ['read'],
      });
    };

    it('should not display Endpoint Exceptions in Administration page', () => {
      loginWithReadAccess();
      cy.visit('app/security/manage');
      cy.getByTestSubj('LandingItem').should('not.contain', 'Endpoint exceptions');
    });

    it('should not display Endpoint Exceptions in Manage side panel', () => {
      loginWithReadAccess();
      cy.visit(APP_PATH);

      essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ENDPOINT_EXCEPTIONS);
      cy.getByTestSubj('solutionSideNavPanel')
        .find(essSecurityHeaders.ENDPOINT_EXCEPTIONS)
        .should('not.exist');
    });

    it('should display Not Found page when opening url directly', () => {
      loginWithReadAccess();
      cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);
      cy.getByTestSubj('notFoundPage').should('exist');
    });
  });

  describe('Serverless', { tags: ['@serverless', '@skipInServerlessMKI'] }, () => {
    it('should not display Endpoint Exceptions in Assets side panel ', () => {
      // instead of testing with the lowest access (READ), we're testing with t3_analyst with WRITE access,
      // as we neither have any role with READ access, nor custom roles on serverless yet
      login(ROLE.t3_analyst);
      cy.visit(APP_PATH);

      serverlessSecurityHeaders.showMoreItems();
      serverlessSecurityHeaders.openNavigationPanelFor(
        serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS
      );
      cy.get(serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS).should('not.exist');
    });

    it('should display Not Found page when opening url directly', () => {
      login(ROLE.t3_analyst);
      cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);
      cy.getByTestSubj('notFoundPage').should('exist');
    });
  });
});
