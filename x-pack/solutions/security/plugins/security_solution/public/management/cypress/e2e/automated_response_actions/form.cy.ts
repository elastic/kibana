/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addEndpointResponseAction,
  fillUpNewRule,
  focusAndOpenCommandDropdown,
  tryAddingDisabledResponseAction,
  validateAvailableCommands,
  visitRuleActions,
  selectIsolateAndSaveWithoutEnabling,
  fillUpNewEsqlRule,
} from '../../tasks/response_actions';
import { cleanupRule, generateRandomStringName, loadRule } from '../../tasks/api_fixtures';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';
import { login, ROLE } from '../../tasks/login';

export const RESPONSE_ACTIONS_ERRORS = 'response-actions-error';

// FLAKY: https://github.com/elastic/kibana/issues/248743
describe.skip(
  'Form',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    describe('User with no access can not create an endpoint response action', () => {
      beforeEach(() => {
        login(ROLE.rule_author);
      });

      it('no endpoint response action option during rule creation', () => {
        fillUpNewRule();
        tryAddingDisabledResponseAction();
      });
    });

    describe('User with access can create and save an endpoint response action', () => {
      const testedCommand = 'isolate';
      const secondTestedCommand = 'suspend-process';
      let ruleId: string;
      const [ruleName, ruleDescription] = generateRandomStringName(2);

      beforeEach(() => {
        login(ROLE.soc_manager);
      });
      afterEach(() => {
        if (ruleId) {
          cleanupRule(ruleId);
        }
      });

      it('create and save endpoint response action inside of a rule', () => {
        fillUpNewRule(ruleName, ruleDescription);
        addEndpointResponseAction();
        focusAndOpenCommandDropdown();
        validateAvailableCommands();
        cy.getByTestSubj(`command-type-${testedCommand}`).click();
        addEndpointResponseAction();
        focusAndOpenCommandDropdown(1);
        validateAvailableCommands();
        // tested command selected in previous action, should be disabled.
        cy.getByTestSubj(`command-type-${testedCommand}`).should('have.attr', 'disabled');
        // Remove first response action, this should unlock tested command as an option
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('remove-response-action').click();
        });
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('commandTypeField').click();
        });
        cy.getByTestSubj(`command-type-${testedCommand}`).should('not.have.attr', 'disabled');
        cy.getByTestSubj(`command-type-${testedCommand}`).click();

        addEndpointResponseAction();
        focusAndOpenCommandDropdown(1);
        cy.getByTestSubj(`command-type-${secondTestedCommand}`).click();
        cy.getByTestSubj('config-overwrite-toggle').click();
        cy.getByTestSubj('config-custom-field-name').should('have.value', '');

        cy.intercept('POST', '/api/detection_engine/rules', (request) => {
          const isolateResult = {
            action_type_id: ResponseActionTypesEnum['.endpoint'],
            params: {
              command: testedCommand,
              comment: 'example1',
            },
          };
          const processResult = {
            action_type_id: ResponseActionTypesEnum['.endpoint'],
            params: {
              command: secondTestedCommand,
              comment: 'example1',
              config: {
                field: 'process.entity_id',
                overwrite: false,
              },
            },
          };
          expect(request.body.response_actions[0]).to.deep.equal(isolateResult);
          expect(request.body.response_actions[1]).to.deep.equal(processResult);
          request.continue((response) => {
            ruleId = response.body.id;
            response.send(response.body);
          });
        });
        cy.getByTestSubj(RESPONSE_ACTIONS_ERRORS).should('not.exist');

        cy.getByTestSubj('create-enabled-false').click();

        cy.getByTestSubj(RESPONSE_ACTIONS_ERRORS).within(() => {
          cy.contains(
            'Custom field name selection is required when the process.pid toggle is disabled.'
          );
        });
        // field name can be cleared out
        cy.getByTestSubj(`response-actions-list-item-1`).within(() => {
          cy.getByTestSubj('config-custom-field-name').should('have.text', '');
          cy.getByTestSubj('config-custom-field-name').type('process.entity_id{downArrow}{enter}');
          cy.getByTestSubj('config-custom-field-name').should('contain', 'process.entity_id');
          cy.getByTestSubj('comboBoxClearButton').click();
          cy.getByTestSubj('config-custom-field-name').should('not.contain', 'process.entity_id');
          cy.getByTestSubj('config-custom-field-name').type('process.entity_id{downArrow}{enter}');
        });

        cy.getByTestSubj('create-enabled-false').click();
        cy.contains(`${ruleName} was created`);
      });
    });

    describe('User with access can edit and delete an endpoint response action', () => {
      let ruleId: string;
      let ruleName: string;
      const newDescription = 'Example suspend process description';
      const secondTestedCommand = 'suspend-process';

      beforeEach(() => {
        login(ROLE.soc_manager);
        loadRule().then((res) => {
          ruleId = res.id;
          ruleName = res.name;
        });
      });
      afterEach(() => {
        cleanupRule(ruleId);
      });

      it('edit response action inside of a rule', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj(`response-actions-list-item-1`).within(() => {
          cy.getByTestSubj('input').should('have.value', 'Suspend host');
          cy.getByTestSubj('input').type(`{selectall}{backspace}${newDescription}`);
          cy.getByTestSubj('config-overwrite-toggle').click();
          cy.getByTestSubj('config-custom-field-name').should('have.value', '');
          cy.getByTestSubj('config-overwrite-toggle').click();
          cy.getByTestSubj('config-custom-field-name').type('process.entity_id{downArrow}{enter}');
        });

        cy.intercept('PUT', '/api/detection_engine/rules').as('updateResponseAction');
        cy.getByTestSubj('ruleEditSubmitButton').click();
        cy.wait('@updateResponseAction').should(({ request }) => {
          const query = {
            params: {
              command: secondTestedCommand,
              comment: newDescription,
              config: {
                field: 'process.entity_id',
                overwrite: false,
              },
            },
            action_type_id: ResponseActionTypesEnum['.endpoint'],
          };
          expect(request.body.response_actions[1]).to.deep.equal(query);
        });
        cy.contains(`${ruleName} was saved`).should('exist');
      });

      it('delete response action inside of a rule', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('remove-response-action').click();
        });
        cy.intercept('PUT', '/api/detection_engine/rules').as('deleteResponseAction');
        cy.getByTestSubj('ruleEditSubmitButton').click();
        cy.wait('@deleteResponseAction').should(({ request }) => {
          expect(request.body.response_actions.length).to.be.equal(2);
        });
        cy.contains(`${ruleName} was saved`).should('exist');
      });
    });

    describe('User should be able to add response action to ESQL rule', () => {
      const [ruleName, ruleDescription] = generateRandomStringName(2);

      beforeEach(() => {
        login(ROLE.soc_manager);
      });

      it('create and save endpoint response action inside of a rule', () => {
        const query = 'FROM * METADATA _index, _id';
        fillUpNewEsqlRule(ruleName, ruleDescription, query);
        addEndpointResponseAction();
        focusAndOpenCommandDropdown();
        validateAvailableCommands();
        selectIsolateAndSaveWithoutEnabling(ruleName);
      });
    });

    describe('User should not see endpoint action when no rbac', () => {
      const [ruleName, ruleDescription] = generateRandomStringName(2);

      beforeEach(() => {
        login(ROLE.rule_author);
      });

      // let currentUrl
      it('response actions are disabled', () => {
        fillUpNewRule(ruleName, ruleDescription);
        cy.getByTestSubj('response-actions-wrapper').within(() => {
          cy.getByTestSubj('Elastic Defend-response-action-type-selection-option').should(
            'be.disabled'
          );
        });
      });
    });

    describe('User without access can not edit, add nor delete an endpoint response action', () => {
      let ruleId: string;

      beforeEach(() => {
        login(ROLE.rule_author);
        loadRule().then((res) => {
          ruleId = res.id;
        });
      });

      afterEach(() => {
        cleanupRule(ruleId);
      });

      it('All response action controls are disabled', () => {
        visitRuleActions(ruleId);
        cy.getByTestSubj('edit-rule-actions-tab').click();

        cy.getByTestSubj('response-actions-wrapper').within(() => {
          cy.getByTestSubj('Elastic Defend-response-action-type-selection-option').should(
            'be.disabled'
          );
        });
        cy.getByTestSubj(`response-actions-list-item-0`).within(() => {
          cy.getByTestSubj('commandTypeField').should('have.text', 'isolate, ').and('be.disabled'); // Note: the trailing `, ` comes from screen-reader-only text
          cy.getByTestSubj('input').should('have.value', 'Isolate host').and('be.disabled');
          cy.getByTestSubj('remove-response-action').should('be.disabled');
          // Try removing action
          cy.getByTestSubj('remove-response-action').click({ force: true });
        });
        cy.getByTestSubj(`response-actions-list-item-2`).should('exist');
        tryAddingDisabledResponseAction(3);
      });
    });
  }
);
