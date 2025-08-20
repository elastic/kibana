/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import { APP_ENDPOINT_EXCEPTIONS_PATH, APP_PATH } from '../../../../../common/constants';
import { login, ROLE } from '../../tasks/login';

describe('Endpoint exceptions - preserving behaviour without `endpointExceptionsMovedUnderManagement` feature flag', () => {
  describe('ESS', { tags: ['@ess'] }, () => {
    it('should not display Endpoint Exceptions in Administration page', () => {
      login(ROLE.t1_analyst);
      cy.visit('app/security/manage');
      cy.getByTestSubj('LandingItem').should('not.contain', 'Endpoint exceptions');
    });

    it('should not display Endpoint Exceptions in Manage side panel', () => {
      login(ROLE.t1_analyst);
      cy.visit(APP_PATH);

      essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ENDPOINT_EXCEPTIONS);
      cy.getByTestSubj('solutionSideNavPanel')
        .find(essSecurityHeaders.ENDPOINT_EXCEPTIONS)
        .should('not.exist');
    });

    it('should display Not Found page when opening url directly', () => {
      login(ROLE.t1_analyst);
      cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);
      cy.getByTestSubj('notFoundPage').should('exist');
    });
  });

  describe('Serverless', { tags: ['@serverless', '@skipInServerlessMKI'] }, () => {
    it('should not display Endpoint Exceptions in Assets side panel ', () => {
      login(ROLE.t1_analyst);
      cy.visit(APP_PATH);

      serverlessSecurityHeaders.openNavigationPanelFor(
        serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS
      );
      cy.get(serverlessSecurityHeaders.ENDPOINT_EXCEPTIONS).should('not.exist');
    });

    it('should display Not Found page when opening url directly', () => {
      login(ROLE.t1_analyst);
      cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);
      cy.getByTestSubj('notFoundPage').should('exist');
    });
  });
});
