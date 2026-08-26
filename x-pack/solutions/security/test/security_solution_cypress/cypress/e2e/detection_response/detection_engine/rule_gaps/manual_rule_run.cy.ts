/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLLAPSED_ACTION_BTN,
  MANUAL_RULE_RUN_ACTION_BTN,
  RULE_DETAILS_MANUAL_RULE_RUN_BTN,
  TOASTER,
} from '../../../../screens/alerts_detection_rules';
import {
  BULK_ACTIONS_BTN,
  BULK_MANUAL_RULE_RUN_BTN,
  BULK_FILL_RULE_GAPS_BTN,
} from '../../../../screens/rules_bulk_actions';
import {
  RULE_FILL_ALL_GAPS_BUTTON,
  POPOVER_ACTIONS_TRIGGER_BUTTON,
} from '../../../../screens/rule_details';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import {
  disableAutoRefresh,
  goToRuleDetailsOf,
  manuallyRunFirstRule,
  manualRuleRunFromDetailsPage,
  selectRulesByName,
} from '../../../../tasks/alerts_detection_rules';
import { goToExecutionLogTab, visitRuleDetailsPage } from '../../../../tasks/rule_details';
import { getNewRule } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import { loginWithUser, login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { RULES_URL } from '../../../../urls/navigation';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  rulesAll,
  rulesAllUser,
  rulesAllManualRunNone,
  rulesAllManualRunNoneUser,
  rulesReadManualRunAll,
  rulesReadManualRunAllUser,
} from '../../../../tasks/privileges';
import { IS_SERVERLESS } from '../../../../env_var_names_constants';

describe('Manual rule run', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    if (!Cypress.env(IS_SERVERLESS)) {
      createUsersAndRoles([rulesReadManualRunAllUser], [rulesReadManualRunAll]);
    }
  });

  after(() => {
    if (!Cypress.env(IS_SERVERLESS)) {
      deleteUsersAndRoles([rulesReadManualRunAllUser], [rulesReadManualRunAll]);
    }
  });

  beforeEach(() => {
    if (Cypress.env(IS_SERVERLESS)) {
      login();
    } else {
      loginWithUser(rulesReadManualRunAllUser);
    }
    deleteAlertsAndRules();
  });

  it('schedule from rule details page', () => {
    createRule(getNewRule({ rule_id: 'new custom rule', interval: '5m', from: 'now-6m' })).then(
      (rule) => visitRuleDetailsPage(rule.body.id)
    );
    manualRuleRunFromDetailsPage();

    cy.get(TOASTER).should('have.text', 'Successfully scheduled manual run for 1 rule');
  });

  it('schedule from rules management table', () => {
    createRule(getNewRule({ rule_id: 'new custom rule', interval: '5m', from: 'now-6m' })).then(
      (rule) => {
        visitRulesManagementTable();
        disableAutoRefresh();
        manuallyRunFirstRule();

        cy.get(TOASTER).should('have.text', 'Successfully scheduled manual run for 1 rule');
      }
    );
  });
});

describe('Manual rule run RBAC', { tags: ['@ess'] }, () => {
  const testRuleName = 'Manual run RBAC test rule';
  const usersToCreate = [rulesAllUser, rulesAllManualRunNoneUser, rulesReadManualRunAllUser];
  const rolesToCreate = [rulesAll, rulesAllManualRunNone, rulesReadManualRunAll];

  before(() => {
    deleteAlertsAndRules();
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    createUsersAndRoles(usersToCreate, rolesToCreate);
    createRule(
      getNewRule({
        rule_id: 'manual-run-rbac',
        name: testRuleName,
        interval: '5m',
        from: 'now-6m',
      })
    );
  });

  after(() => {
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    deleteAlertsAndRules();
  });

  describe('User with rules.all + no manualRun subfeature', () => {
    beforeEach(() => {
      loginWithUser(rulesAllManualRunNoneUser);
      visit(RULES_URL);
    });

    it('manual rule run row action is disabled in rules table', () => {
      disableAutoRefresh();
      cy.get(COLLAPSED_ACTION_BTN).first().click();
      cy.get(MANUAL_RULE_RUN_ACTION_BTN).should('be.disabled');
    });

    it('manual rule run is disabled in rule details overflow menu', () => {
      goToRuleDetailsOf(testRuleName);
      cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
      cy.get(RULE_DETAILS_MANUAL_RULE_RUN_BTN).should('be.disabled');
    });

    it('fill gaps button is not visible in execution log tab', () => {
      goToRuleDetailsOf(testRuleName);
      goToExecutionLogTab();
      cy.get(RULE_FILL_ALL_GAPS_BUTTON).should('not.exist');
    });

    it('bulk manual run and fill gaps are disabled', () => {
      disableAutoRefresh();
      selectRulesByName([testRuleName]);
      cy.get(BULK_ACTIONS_BTN).click();
      cy.get(BULK_MANUAL_RULE_RUN_BTN).should('be.disabled');
      cy.get(BULK_FILL_RULE_GAPS_BTN).should('be.disabled');
    });
  });
});
