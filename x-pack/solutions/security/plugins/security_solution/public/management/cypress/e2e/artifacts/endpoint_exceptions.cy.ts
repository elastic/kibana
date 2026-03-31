/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../../../common/endpoint/constants';
import {
  APP_ENDPOINT_EXCEPTIONS_PATH,
  APP_MANAGE_PATH,
  APP_PATH,
  RULES_FEATURE_ID,
  SECURITY_FEATURE_ID,
} from '../../../../../common/constants';
import { login, ROLE } from '../../tasks/login';
import {
  createArtifactList,
  createPerPolicyArtifact,
  fetchEndpointExceptionPerPolicyOptInStatus,
  resetEndpointExceptionPerPolicyOptInStatus,
  removeAllArtifacts,
} from '../../tasks/artifacts';
import { getArtifactsListTestDataForArtifact } from '../../fixtures/artifacts_page';

describe(
  'Endpoint exceptions - under Security Management/Assets',
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
    describe('Navigation and access control', () => {
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
    });

    describe('Per-policy opt-in behaviour', { tags: ['@ess'] }, () => {
      before(() => {
        removeAllArtifacts();

        createArtifactList(ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id);
        createPerPolicyArtifact(
          'an endpoint exception',
          getArtifactsListTestDataForArtifact('endpointExceptions').createRequestBody
        );
        resetEndpointExceptionPerPolicyOptInStatus();
      });

      after(() => {
        resetEndpointExceptionPerPolicyOptInStatus();
        removeAllArtifacts();
      });

      it('should allow superuser to opt-in to per-policy Endpoint exceptions', () => {
        cy.intercept('POST', ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE).as('sendOptInStatus');

        fetchEndpointExceptionPerPolicyOptInStatus().then((status) => {
          expect(status).to.equal(false);
        });

        login('elastic');
        cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

        cy.getByTestSubj('updateDetailsEndpointExceptionsPerPolicyOptInButton').click();

        cy.getByTestSubj('confirmEndpointExceptionsPerPolicyOptInButton').click();
        cy.wait('@sendOptInStatus');

        cy.contains('Updated to policy-based exceptions');
        cy.contains('You can now apply your endpoint exceptions on a policy basis.');
        cy.getByTestSubj('updateDetailsEndpointExceptionsPerPolicyOptInButton').should('not.exist');

        fetchEndpointExceptionPerPolicyOptInStatus().then((status) => {
          expect(status).to.equal(true);
        });
      });
    });
  }
);
