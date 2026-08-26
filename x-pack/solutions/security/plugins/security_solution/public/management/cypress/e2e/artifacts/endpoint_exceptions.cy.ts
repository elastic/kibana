/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as essSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/security_header';
import * as serverlessSecurityHeaders from '@kbn/test-suites-xpack-security/security_solution_cypress/cypress/screens/serverless_security_header';
import {
  ENDPOINT_ARTIFACT_LISTS,
  EXCEPTION_LIST_ITEM_URL,
} from '@kbn/securitysolution-list-constants';
import { recurse } from 'cypress-recurse';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../../../common/endpoint/constants';
import {
  APP_ALERTS_PATH,
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
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../types';
import { performUserActions, type FormAction } from '../../tasks/perform_user_actions';
import { getArtifactListEmptyStateAddButton } from '../../screens';

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

        it('should display Artifacts in Administration page', () => {
          loginWithReadAccess();

          cy.visit(APP_MANAGE_PATH);
          cy.getByTestSubj('pageContainer').contains('Artifacts');
        });

        it('should be able to navigate to Endpoint Exceptions from Administration page', () => {
          loginWithReadAccess();
          cy.visit(APP_MANAGE_PATH);
          cy.getByTestSubj('pageContainer').contains('Artifacts').click();

          cy.getByTestSubj('endpointExceptionsListPage-container').should('exist');
        });

        it('should display Artifacts in Manage side panel', () => {
          loginWithReadAccess();

          cy.visit(APP_PATH);

          essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ARTIFACTS);
          cy.get(essSecurityHeaders.ARTIFACTS).should('exist');
        });

        it('should be able to navigate to Endpoint Exceptions from Manage side panel', () => {
          loginWithReadAccess();
          cy.visit(APP_PATH);

          essSecurityHeaders.openNavigationPanelFor(essSecurityHeaders.ARTIFACTS);
          cy.get(essSecurityHeaders.ARTIFACTS).click();

          cy.getByTestSubj('endpointExceptionsListPage-container').should('exist');
        });

        // todo: add 'should NOT' test case when Endpoint Exceptions sub-feature privilege is separated from Security
      });

      describe('Serverless', { tags: ['@serverless', '@skipInServerlessMKI'] }, () => {
        it('should display Artifacts in Assets side panel ', () => {
          // testing with t3_analyst with WRITE access, as we don't support custom roles on serverless yet
          login(ROLE.t3_analyst);

          cy.visit(APP_PATH);

          serverlessSecurityHeaders.showMoreItems();
          serverlessSecurityHeaders.openNavigationPanelFor(serverlessSecurityHeaders.ARTIFACTS);
          cy.get(serverlessSecurityHeaders.ARTIFACTS).should('exist');
        });

        // todo: add 'should NOT' test case when custom roles are available on serverless
      });
    });

    // Only running on ESS, because on Serverless we cannot remove the opt-in status SO
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

    // Skipped in Serverless MKI due to interactions with internal indices
    describe('OR operator', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
      let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;

      const artifactNameActions: FormAction[] = [
        {
          type: 'input',
          selector: 'endpointExceptions-form-name-input',
          value: 'Endpoint exception name',
        },
        {
          type: 'input',
          selector: 'endpointExceptions-form-description-input',
          value: 'This is the endpoint exception description',
        },
      ];

      const firstConditionActions: FormAction[] = [
        {
          type: 'input',
          selector: 'fieldAutocompleteComboBox',
          value: 'agent.version',
        },
        {
          type: 'click',
          selector: 'valuesAutocompleteMatch',
        },
        {
          type: 'input',
          selector: 'valuesAutocompleteMatch',
          value: '1234',
        },
        {
          type: 'click',
          selector: 'endpointExceptions-form-description-input',
        },
      ];

      before(() => {
        indexEndpointHosts().then((indexEndpoints) => {
          endpointData = indexEndpoints;
        });
      });

      beforeEach(() => {
        removeAllArtifacts();
      });

      after(() => {
        removeAllArtifacts();

        endpointData?.cleanup();
        endpointData = undefined;
      });

      const addConditionWithOR = (field: string, value: string) => {
        cy.getByTestSubj('exceptionsOrButton').click();

        cy.getByTestSubj('fieldAutocompleteComboBox').last().type(field);
        cy.getByTestSubj('valuesAutocompleteMatch').last().click();
        cy.getByTestSubj('valuesAutocompleteMatch').last().type(value);
      };

      const shouldHaveConditionsOnScreen = (conditions: string[]) =>
        cy
          .getByTestSubj('endpointExceptionsListPage-card-criteriaConditions-condition')
          .then(($conditions) => {
            const conditionsText = $conditions.map((_, element) => Cypress.$(element).text()).get();

            expect(conditionsText).to.include.members(conditions);
          });

      describe('on Artifacts page', () => {
        it('should create 2 artifacts when using 1 OR operator during CREATE', () => {
          cy.intercept('POST', EXCEPTION_LIST_ITEM_URL).as('createExceptionItem');

          login();
          cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

          getArtifactListEmptyStateAddButton('endpointExceptions').click();

          performUserActions(artifactNameActions);
          performUserActions(firstConditionActions);

          addConditionWithOR('agent.type', 'endpoint');

          cy.getByTestSubj('endpointExceptionsListPage-flyout-submitButton').click();

          // There should be 2 artifacts created
          cy.get('@createExceptionItem.all').should('have.length', 2);

          // All with same name
          cy.getByTestSubj('endpointExceptionsListPage-card-header-title')
            .should('have.length', 2)
            .each((card) => expect(card).to.have.text('Endpoint exception name'));

          // and different conditions
          shouldHaveConditionsOnScreen(['AND agent.versionIS 1234', 'AND agent.typeIS endpoint']);
        });

        it('should create 3 artifacts when using 2 OR operators during CREATE', () => {
          cy.intercept('POST', EXCEPTION_LIST_ITEM_URL).as('createExceptionItem');

          login();
          cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

          getArtifactListEmptyStateAddButton('endpointExceptions').click();

          performUserActions(artifactNameActions);
          performUserActions(firstConditionActions);

          addConditionWithOR('agent.type', 'endpoint');
          addConditionWithOR('host.user.email', 'cheese');

          cy.getByTestSubj('endpointExceptionsListPage-flyout-submitButton').click();

          // There should be 3 artifacts created
          cy.get('@createExceptionItem.all').should('have.length', 3);

          // All with same name
          cy.getByTestSubj('endpointExceptionsListPage-card-header-title')
            .should('have.length', 3)
            .each((card) => expect(card).to.have.text('Endpoint exception name'));

          // and different conditions
          shouldHaveConditionsOnScreen([
            'AND agent.versionIS 1234',
            'AND agent.typeIS endpoint',
            'AND host.user.emailIS cheese',
          ]);
        });

        it('should create multiple artifacts when using OR operator during EDIT', () => {
          login();
          cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

          // Create one artifact
          getArtifactListEmptyStateAddButton('endpointExceptions').click();
          performUserActions(artifactNameActions);
          performUserActions(firstConditionActions);
          cy.getByTestSubj('endpointExceptionsListPage-flyout-submitButton').click();
          cy.getByTestSubj('endpointExceptionsListPage-card').should('have.length', 1);

          // Open artifact to edit
          cy.getByTestSubj('endpointExceptionsListPage-card-header-actions-button').click();
          cy.getByTestSubj('endpointExceptionsListPage-card-cardEditAction').click();

          addConditionWithOR('agent.type', 'endpoint');
          addConditionWithOR('host.user.email', 'cheese');

          cy.intercept('PUT', EXCEPTION_LIST_ITEM_URL).as('updateExceptionItem');
          cy.intercept('POST', EXCEPTION_LIST_ITEM_URL).as('createExceptionItem');

          cy.getByTestSubj('endpointExceptionsListPage-flyout-submitButton').click();

          // There should be 1 artifact edited and 2 new created
          cy.get('@updateExceptionItem.all').should('have.length', 1);
          cy.get('@createExceptionItem.all').should('have.length', 2);

          // All 3 with the same name
          cy.getByTestSubj('endpointExceptionsListPage-card-header-title')
            .should('have.length', 3)
            .each((card) => expect(card).to.have.text('Endpoint exception name'));

          // and different conditions
          shouldHaveConditionsOnScreen([
            'AND agent.versionIS 1234',
            'AND agent.typeIS endpoint',
            'AND host.user.emailIS cheese',
          ]);
        });
      });

      describe('on Alerts page', () => {
        const clearPrefilledConditions = () =>
          recurse(
            () => {
              cy.getByTestSubj('builderItemEntryDeleteButton').first().click();
              return cy.getByTestSubj('builderItemEntryDeleteButton').first();
            },

            // recurse until first button is disabled
            (firstDeleteButton) => firstDeleteButton.prop('disabled') === true,

            { delay: 100 }
          );

        it('should create 2 artifacts when using 1 OR operator during CREATE', () => {
          cy.intercept('POST', EXCEPTION_LIST_ITEM_URL).as('createExceptionItem');

          login();
          cy.visit(APP_ALERTS_PATH);

          cy.getByTestSubj('timeline-context-menu-button').first().click();
          cy.getByTestSubj('add-endpoint-exception-menu-item').click();

          clearPrefilledConditions();

          performUserActions(artifactNameActions);
          performUserActions(firstConditionActions);

          addConditionWithOR('agent.type', 'endpoint');

          cy.getByTestSubj(`add-endpoint-exception-confirm-button`).click();

          // There should be 2 artifacts created
          cy.get('@createExceptionItem.all').should('have.length', 2);

          // Navigate to Endpoint Exceptions page to check the artifacts
          cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

          // All with same name
          cy.getByTestSubj('endpointExceptionsListPage-card-header-title')
            .should('have.length', 2)
            .each((card) => expect(card).to.have.text('Endpoint exception name'));

          // and different conditions
          shouldHaveConditionsOnScreen(['AND agent.versionIS 1234', 'AND agent.typeIS endpoint']);
        });

        it('should create 3 artifacts when using 2 OR operators during CREATE', () => {
          cy.intercept('POST', EXCEPTION_LIST_ITEM_URL).as('createExceptionItem');

          login();
          cy.visit(APP_ALERTS_PATH);

          cy.getByTestSubj('timeline-context-menu-button').first().click();
          cy.getByTestSubj('add-endpoint-exception-menu-item').click();

          clearPrefilledConditions();

          performUserActions(artifactNameActions);
          performUserActions(firstConditionActions);

          addConditionWithOR('agent.type', 'endpoint');
          addConditionWithOR('host.user.email', 'cheese');

          cy.getByTestSubj(`add-endpoint-exception-confirm-button`).click();

          // There should be 3 artifacts created
          cy.get('@createExceptionItem.all').should('have.length', 3);

          // Navigate to Endpoint Exceptions page to check the artifacts
          cy.visit(APP_ENDPOINT_EXCEPTIONS_PATH);

          // All with same name
          cy.getByTestSubj('endpointExceptionsListPage-card-header-title')
            .should('have.length', 3)
            .each((card) => expect(card).to.have.text('Endpoint exception name'));

          // and different conditions
          shouldHaveConditionsOnScreen([
            'AND agent.versionIS 1234',
            'AND agent.typeIS endpoint',
            'AND host.user.emailIS cheese',
          ]);
        });
      });
    });
  }
);
