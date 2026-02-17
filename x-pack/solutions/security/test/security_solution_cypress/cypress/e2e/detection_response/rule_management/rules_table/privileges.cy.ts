/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_ELASTIC_RULES_BTN,
  CREATE_NEW_RULE_BTN,
  ENABLE_RULE_TOGGLE,
} from '../../../../screens/alerts_detection_rules';
import { loginWithUser } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
  rulesAll,
  rulesAllUser,
  rulesRead,
  rulesReadUser,
  secAll as rulesNone,
  secAllUser as rulesNoneUser,
} from '../../../../tasks/privileges';

import { RULES_URL } from '../../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import {
  createAndEnableRule,
  fillAboutRuleMinimumAndContinue,
  fillDefineCustomRuleAndContinue,
  fillScheduleRuleAndContinue,
} from '../../../../tasks/create_new_rule';
import { enableRule, selectRulesByName } from '../../../../tasks/alerts_detection_rules';
import {
  BULK_ACTIONS_BTN,
  BULK_EXPORT_ACTION_BTN,
  BULK_MANUAL_RULE_RUN_BTN,
  DELETE_RULE_BULK_BTN,
  DISABLE_RULE_BULK_BTN,
  DUPLICATE_RULE_BULK_BTN,
  ENABLE_RULE_BULK_BTN,
} from '../../../../screens/rules_bulk_actions';
import { NO_PRIVILEGES_BOX } from '../../../../screens/common/page';
import { assertSuccessToast } from '../../../../screens/common/toast';
const usersToCreate = [rulesAllUser, rulesReadUser, rulesNoneUser];
const rolesToCreate = [rulesAll, rulesRead, rulesNone];

// As part of the rules RBAC effort, we have created these tests with roles that only have the new rules feature 'securitySolutionVX' enabled in order to test
// the features that said roles should have access to. Notice that the roles created are very minimal and only contain the new rules feature.

describe('Rules table - privileges', { tags: ['@ess'] }, () => {
  const ruleName = 'My rule';
  const createRule = () => {
    const rule = getCustomQueryRuleParams({ name: ruleName });
    loginWithUser(rulesAllUser);
    visit(RULES_URL);
    cy.get(CREATE_NEW_RULE_BTN).click();

    fillDefineCustomRuleAndContinue(rule);
    fillAboutRuleMinimumAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createAndEnableRule();
  };

  before(() => {
    deleteAlertsAndRules();
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    createUsersAndRoles(usersToCreate, rolesToCreate);
    createRule();
  });

  describe('securitySolutionRulesV1.all', () => {
    beforeEach(() => {
      loginWithUser(rulesAllUser);
      visit(RULES_URL);
    });

    it(`should be able to "Enable/Disable" a rule`, () => {
      // Click the rule enable toggle for the only rule we have. The rule is enabled when created so we click to disable
      enableRule(0);
      assertSuccessToast('Rules disabled', 'Successfully disabled 1 rule');

      // Click again to enable
      enableRule(0);
      assertSuccessToast('Rules enabled', 'Successfully enabled 1 rule');
    });

    it(`should see enabled bulk actions from context menu`, () => {
      selectRulesByName([ruleName]);
      cy.get(BULK_ACTIONS_BTN).click();

      type ActionsButtonEnableArray = [string, 'enabled' | 'disabled'][];
      const bulkActionButtonsWhenEnabled: ActionsButtonEnableArray = [
        [BULK_MANUAL_RULE_RUN_BTN, 'enabled'],
        [DISABLE_RULE_BULK_BTN, 'enabled'],
        [ENABLE_RULE_BULK_BTN, 'disabled'],
        [DELETE_RULE_BULK_BTN, 'enabled'],
        [DUPLICATE_RULE_BULK_BTN, 'enabled'],
        [BULK_EXPORT_ACTION_BTN, 'enabled'],
      ];

      for (const [actionButton, enableState] of bulkActionButtonsWhenEnabled) {
        cy.get(actionButton).should(`be.${enableState}`);
      }

      // Click to disable the rule
      enableRule(0);
      assertSuccessToast('Rules disabled', 'Successfully disabled 1 rule');

      cy.get(BULK_ACTIONS_BTN).click();

      const bulkActionsWhenDisabled: ActionsButtonEnableArray = [
        [BULK_MANUAL_RULE_RUN_BTN, 'disabled'],
        [DISABLE_RULE_BULK_BTN, 'disabled'],
        [ENABLE_RULE_BULK_BTN, 'enabled'],
        [DELETE_RULE_BULK_BTN, 'enabled'],
        [DUPLICATE_RULE_BULK_BTN, 'enabled'],
        [BULK_EXPORT_ACTION_BTN, 'enabled'],
      ];

      for (const [actionButton, disabledState] of bulkActionsWhenDisabled) {
        cy.get(actionButton).should(`be.${disabledState}`);
      }
    });
  });

  describe('securitySolutionRulesV1.read', () => {
    beforeEach(() => {
      loginWithUser(rulesReadUser);
      visit(RULES_URL);
    });

    it(`should not be able to trigger "Create rule" process`, () => {
      cy.get(CREATE_NEW_RULE_BTN).should('not.be.enabled');
    });

    it(`should not be able to "Enable/Disable" a rule`, () => {
      cy.get(ENABLE_RULE_TOGGLE).should('not.be.enabled');
    });

    it(`should be able to "Add" a prebuilt rule`, () => {
      cy.get(ADD_ELASTIC_RULES_BTN).should('be.enabled');
    });
  });

  describe('securitySolutionRulesV1 none', () => {
    beforeEach(() => {
      loginWithUser(rulesNoneUser);
      visit(RULES_URL);
    });
    it('should not be able to see the rules management page', () => {
      cy.get(NO_PRIVILEGES_BOX).should('exist');
    });
  });
});
