/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_ALERTING_API_FIND_RULES_PATH } from '@kbn/alerting-plugin/common';
import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { createRule, snoozeRule as snoozeRuleViaAPI } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, deleteConnectors } from '../../../../../tasks/api_calls/common';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { getNewRule } from '../../../../../objects/rule';
import { internalAlertingSnoozeRule } from '../../../../../urls/routes';
import { RULES_MANAGEMENT_TABLE, RULE_NAME } from '../../../../../screens/alerts_detection_rules';
import {
  expectRuleSnoozed,
  expectRuleSnoozedInTable,
  expectRuleUnsnoozed,
  expectRuleUnsnoozedInTable,
  expectSnoozeErrorToast,
  expectSnoozeSuccessToast,
  expectUnsnoozeSuccessToast,
  snoozeRule,
  snoozeRuleInTable,
  unsnoozeRuleInTable,
} from '../../../../../tasks/rule_snoozing';
import { createSlackConnector } from '../../../../../tasks/api_calls/connectors';
import {
  disableAutoRefresh,
  duplicateFirstRule,
  importRules,
} from '../../../../../tasks/alerts_detection_rules';
import { goToActionsStepTab } from '../../../../../tasks/create_new_rule';
import { goToRuleEditSettings, visitRuleDetailsPage } from '../../../../../tasks/rule_details';
import { actionFormSelector } from '../../../../../screens/common/rule_actions';
import { addEmailConnectorAndRuleAction } from '../../../../../tasks/common/rule_actions';
import { saveEditedRule, visitEditRulePage } from '../../../../../tasks/edit_rule';
import { DISABLED_SNOOZE_BADGE } from '../../../../../screens/rule_snoozing';
import { TOOLTIP } from '../../../../../screens/common';

const RULES_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_rules.ndjson';

describe('rule snoozing', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
  });

  it('ensures the rule is snoozed on the rules management page, rule details page and rule editing page', () => {
    createRule(getNewRule({ name: 'Test on all pages', enabled: false }));

    visitRulesManagementTable();
    disableAutoRefresh();

    snoozeRuleInTable({
      tableSelector: RULES_MANAGEMENT_TABLE,
      ruleName: 'Test on all pages',
      duration: '1 hours',
    });

    // Open rule detail page
    cy.get(RULE_NAME).contains('Test on all pages').click();

    expectRuleSnoozed('1 hours');

    // Open rule editing page actions tab
    goToRuleEditSettings();
    goToActionsStepTab();

    expectRuleSnoozed('1 hours');
  });

  describe('Rules management table', () => {
    it('snoozes a rule without actions for 3 hours', () => {
      createRule(getNewRule({ name: 'Test rule without actions', enabled: false }));

      visitRulesManagementTable();
      disableAutoRefresh();

      snoozeRuleInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test rule without actions',
        duration: '3 hours',
      });

      expectSnoozeSuccessToast();
      expectRuleSnoozedInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test rule without actions',
        duration: '3 hours',
      });
    });

    it('snoozes a rule with actions for 2 days', () => {
      createRuleWithActions({ name: 'Test rule with actions' }, createRule);

      visitRulesManagementTable();
      disableAutoRefresh();

      snoozeRuleInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test rule with actions',
        duration: '2 days',
      });

      expectSnoozeSuccessToast();
      expectRuleSnoozedInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test rule with actions',
        duration: '2 days',
      });
    });

    it('unsnoozes a rule with actions', () => {
      createSnoozedRule(getNewRule({ name: 'Snoozed rule' }));

      visitRulesManagementTable();
      disableAutoRefresh();

      unsnoozeRuleInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Snoozed rule',
      });

      expectUnsnoozeSuccessToast();
      expectRuleUnsnoozedInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Snoozed rule',
      });
    });

    it('ensures snooze settings persist after page reload', () => {
      createRule(getNewRule({ name: 'Test persistence', enabled: false }));

      visitRulesManagementTable();
      disableAutoRefresh();

      snoozeRuleInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test persistence',
        duration: '3 days',
      });

      cy.reload();

      expectRuleSnoozedInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test persistence',
        duration: '3 days',
      });
    });

    it('ensures a duplicated rule is not snoozed', () => {
      createRule(getNewRule({ name: 'Test rule', enabled: false }));

      visitRulesManagementTable();
      disableAutoRefresh();

      duplicateFirstRule();

      // Make sure rules table is shown as it navigates to rule editing page after successful duplication
      visitRulesManagementTable();
      disableAutoRefresh();

      expectRuleUnsnoozedInTable({
        tableSelector: RULES_MANAGEMENT_TABLE,
        ruleName: 'Test rule',
      });
    });
  });

  describe('Rule editing page / actions tab', () => {
    beforeEach(() => {
      deleteConnectors();
    });

    it('adds an action to a snoozed rule', { tags: ['@brokenInServerlessQA'] }, () => {
      createSnoozedRule(getNewRule({ name: 'Snoozed rule' })).then(({ body: rule }) => {
        visitEditRulePage(rule.id);
        goToActionsStepTab();

        addEmailConnectorAndRuleAction('abc@example.com', 'Test action');
        saveEditedRule();

        goToRuleEditSettings();
        goToActionsStepTab();

        cy.get(actionFormSelector(0)).should('be.visible');
      });
    });
  });

  describe('importing rules', () => {
    beforeEach(() => {
      cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    });

    it('ensures imported rules are unsnoozed', () => {
      visitRulesManagementTable();

      importRules(RULES_TO_IMPORT_FILENAME);

      cy.wait('@import').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);

        expectRuleUnsnoozedInTable({
          tableSelector: RULES_MANAGEMENT_TABLE,
          ruleName: 'Test Custom Rule',
        });
      });
    });
  });

  describe('Handling errors', () => {
    it('shows an error if unable to load snooze settings', () => {
      createRule(getNewRule({ name: 'Test rule', enabled: false })).then(({ body: rule }) => {
        cy.intercept('GET', `${INTERNAL_ALERTING_API_FIND_RULES_PATH}*`, {
          statusCode: 500,
        });

        visitRuleDetailsPage(rule.id);
      });

      cy.get(DISABLED_SNOOZE_BADGE).trigger('mouseover');

      cy.get(TOOLTIP).contains('Unable to fetch snooze settings');
    });

    it('shows an error if unable to save snooze settings', () => {
      createRule(getNewRule({ name: 'Test rule', enabled: false })).then(({ body: rule }) => {
        cy.intercept('POST', internalAlertingSnoozeRule(rule.id), { forceNetworkError: true });

        visitRuleDetailsPage(rule.id);
      });

      snoozeRule('3 days');

      expectSnoozeErrorToast();
      expectRuleUnsnoozed();
    });
  });
});

function createRuleWithActions(
  ruleParams: Parameters<typeof getNewRule>[0],
  ruleCreator: (
    ruleParams: Parameters<typeof createRule>[0]
  ) => Cypress.Chainable<Cypress.Response<RuleResponse>>
): Cypress.Chainable<Cypress.Response<RuleResponse>> {
  return createSlackConnector().then(({ body }) =>
    ruleCreator(
      getNewRule({
        ...ruleParams,
        actions: [
          {
            id: body.id,
            action_type_id: '.slack',
            group: 'default',
            params: {
              message: 'Some message',
            },
          },
        ],
      })
    )
  );
}

function createSnoozedRule(
  ruleParams: Parameters<typeof createRule>[0]
): Cypress.Chainable<Cypress.Response<RuleResponse>> {
  return createRule(ruleParams).then((response) => {
    const createdRule = response.body;
    const oneDayInMs = 24 * 60 * 60 * 1000;

    snoozeRuleViaAPI(createdRule.id, oneDayInMs);

    return cy.wrap(response);
  });
}
