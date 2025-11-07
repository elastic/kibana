/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN } from '../../../../screens/exceptions';
import {
  CREATE_NEW_RULE_BTN,
  MODAL_CONFIRMATION_BTN,
  RULE_DETAILS_MANUAL_RULE_RUN_BTN,
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
import {
  goToRuleDetailsOf,
  manualRuleRunFromDetailsPage,
} from '../../../../tasks/alerts_detection_rules';
import {
  addFirstExceptionFromRuleDetails,
  goToExceptionsTab,
  goToExecutionLogTab,
  goToRuleEditSettings,
  waitForExecutionLogTabToBePopulated,
} from '../../../../tasks/rule_details';
import { EDIT_SUBMIT_BUTTON } from '../../../../screens/edit_rule';
import {
  EDIT_RULE_SETTINGS_LINK,
  POPOVER_ACTIONS_TRIGGER_BUTTON,
  RULE_FILL_ALL_GAPS_BUTTON,
} from '../../../../screens/rule_details';
import {
  expectRuleSnoozed,
  expectUnsnoozeSuccessToast,
  snoozeRule,
  unsnoozeRule,
} from '../../../../tasks/rule_snoozing';
import { UNSNOOZED_BADGE } from '../../../../screens/rule_snoozing';
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
      goToRuleDetailsOf(ruleName);
    });

    it(`should be able to edit rules`, () => {
      goToRuleEditSettings();
      cy.get(EDIT_SUBMIT_BUTTON).should('be.enabled');
    });

    describe('execution log tab', () => {
      beforeEach(() => {
        goToExecutionLogTab();
      });

      it(`should be able to see the execution history`, () => {
        waitForExecutionLogTabToBePopulated(1);
      });

      it('should be able to trigger gap fills', () => {
        cy.get(RULE_FILL_ALL_GAPS_BUTTON).click();
        cy.get(MODAL_CONFIRMATION_BTN).should('be.enabled');
      });
    });

    it('should be able to trigger manual runs', () => {
      manualRuleRunFromDetailsPage();
    });

    it('should be able to trigger adding exceptions', () => {
      goToExceptionsTab();

      addFirstExceptionFromRuleDetails(
        {
          field: 'host.name',
          operator: 'is one of',
          values: ['foo', 'FOO', 'bar'],
        },
        'Some exception name'
      );
    });

    it('should be able to adjust snooze settings', () => {
      snoozeRule('3 days');
      expectRuleSnoozed('3 days');
      unsnoozeRule();
      expectUnsnoozeSuccessToast();
    });
  });

  describe('securitySolutionRulesV1.read', () => {
    beforeEach(() => {
      loginWithUser(rulesReadUser);
      visit(RULES_URL);
      goToRuleDetailsOf(ruleName);
    });

    it(`should not be able to edit rules`, () => {
      cy.get(EDIT_RULE_SETTINGS_LINK).should('be.disabled');
    });

    describe('execution log tab', () => {
      beforeEach(() => {
        goToExecutionLogTab();
      });

      it(`should be able to see the execution history`, () => {
        waitForExecutionLogTabToBePopulated(1);
      });

      it('should not be able to trigger gap fills', () => {
        cy.get(RULE_FILL_ALL_GAPS_BUTTON).should('not.exist');
      });
    });

    it('should not be able to trigger manual runs', () => {
      cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
      cy.get(RULE_DETAILS_MANUAL_RULE_RUN_BTN).should('be.disabled');
    });

    it('should not be able to trigger adding exceptions', () => {
      goToExceptionsTab();

      cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).should('not.exist');
    });

    it('should not be able to adjust snooze settings', () => {
      cy.get(UNSNOOZED_BADGE).should('be.disabled');
    });
  });
});
