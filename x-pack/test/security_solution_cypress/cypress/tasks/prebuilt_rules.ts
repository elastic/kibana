/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_ADD_PATH, RULES_UPDATES } from '@kbn/security-solution-plugin/common/constants';
import {
  ADD_ELASTIC_RULES_BTN,
  ADD_ELASTIC_RULES_TABLE,
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  INSTALL_ALL_RULES_BUTTON,
  INSTALL_SELECTED_RULES_BUTTON,
  RULES_MANAGEMENT_TABLE,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  RULE_CHECKBOX,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
  TOASTER,
  UPGRADE_ALL_RULES_BUTTON,
  UPGRADE_SELECTED_RULES_BUTTON,
} from '../screens/alerts_detection_rules';
import { BACK_TO_RULES_TABLE } from '../screens/rule_details';
import type { SAMPLE_PREBUILT_RULE } from './api_calls/prebuilt_rules';

export const addElasticRulesButtonClick = () => {
  cy.get(ADD_ELASTIC_RULES_BTN).click();
  cy.location('pathname').should('include', RULES_ADD_PATH);
};

export const ruleUpdatesTabClick = () => {
  cy.get(RULES_UPDATES_TAB).click();
  cy.location('pathname').should('include', RULES_UPDATES);
};

interface RuleInstallUpgradeAssertionPayload {
  rules: Array<typeof SAMPLE_PREBUILT_RULE>;
  didRequestFail?: boolean;
}

export const assertRuleAvailableForInstallAndInstallOne = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptInstallationRequestToFail(rules, didRequestFail);
  const rule = rules[0];
  cy.get(getInstallSingleRuleButtonByRuleId(rule['security-rule'].rule_id)).click();
  cy.wait('@installPrebuiltRules');
  assertInstallationSuccessOrFailure([rule], didRequestFail);
};

export const assertRuleAvailableForInstallAndInstallSelected = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptInstallationRequestToFail(rules, didRequestFail);
  let i = 0;
  for (const rule of rules) {
    cy.get(RULE_CHECKBOX).eq(i).click();
    cy.get(ADD_ELASTIC_RULES_TABLE).contains(rule['security-rule'].name);
    i++;
  }
  cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
  cy.wait('@installPrebuiltRules');
  assertInstallationSuccessOrFailure(rules, didRequestFail);
};

export const assertRuleAvailableForInstallAndInstallAllInPage = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptInstallationRequestToFail(rules, didRequestFail);
  for (const rule of rules) {
    cy.get(ADD_ELASTIC_RULES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
  cy.get(INSTALL_SELECTED_RULES_BUTTON).click();
  cy.wait('@installPrebuiltRules');
  assertInstallationSuccessOrFailure(rules, didRequestFail);
};

export const assertRuleAvailableForInstallAndInstallAll = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptInstallationRequestToFail(rules, didRequestFail);
  for (const rule of rules) {
    cy.get(ADD_ELASTIC_RULES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(INSTALL_ALL_RULES_BUTTON).click();
  cy.wait('@installPrebuiltRules');
  assertInstallationSuccessOrFailure(rules, didRequestFail);
};

const assertInstallationSuccessOrFailure = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>,
  didRequestFail: boolean
) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = didRequestFail
    ? `${rules.length} ${rulesString} failed to install.`
    : `${rules.length} ${rulesString} installed successfully.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);
  if (didRequestFail) {
    for (const rule of rules) {
      cy.get(ADD_ELASTIC_RULES_TABLE).contains(rule['security-rule'].name);
    }
  } else {
    cy.get(BACK_TO_RULES_TABLE).click();
    for (const rule of rules) {
      cy.get(RULES_MANAGEMENT_TABLE).contains(rule['security-rule'].name);
    }
  }
};

const interceptInstallationRequestToFail = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>,
  didRequestFail: boolean
) => {
  if (didRequestFail) {
    cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform', {
      body: {
        summary: {
          succeeded: [],
          skipped: [],
          failed: rules.length,
        },
      },
    }).as('installPrebuiltRules');
  }
};

export const assertRuleUpgradeAvailableAndUpgradeOne = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptUpgradeRequestToFail(rules, didRequestFail);
  const rule = rules[0];
  cy.get(getUpgradeSingleRuleButtonByRuleId(rule['security-rule'].rule_id)).click();
  cy.wait('@updatePrebuiltRules');
  assertUpgradeSuccessOrFailure([rule], didRequestFail);
};

export const assertRuleUpgradeAvailableAndUpgradeSelected = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptUpgradeRequestToFail(rules, didRequestFail);
  let i = 0;
  for (const rule of rules) {
    cy.get(RULE_CHECKBOX).eq(i).click();
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
    i++;
  }
  cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
  assertUpgradeSuccessOrFailure(rules, didRequestFail);
};

export const assertRuleUpgradeAvailableAndUpgradeAllInPage = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptUpgradeRequestToFail(rules, didRequestFail);
  for (const rule of rules) {
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();
  cy.get(UPGRADE_SELECTED_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
  assertUpgradeSuccessOrFailure(rules, didRequestFail);
};

export const assertRuleUpgradeAvailableAndUpgradeAll = ({
  rules,
  didRequestFail = false,
}: RuleInstallUpgradeAssertionPayload) => {
  interceptUpgradeRequestToFail(rules, didRequestFail);
  for (const rule of rules) {
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  }
  cy.get(UPGRADE_ALL_RULES_BUTTON).click();
  cy.wait('@updatePrebuiltRules');
  assertUpgradeSuccessOrFailure(rules, didRequestFail);
};

const assertUpgradeSuccessOrFailure = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>,
  didRequestFail: boolean
) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = didRequestFail
    ? `${rules.length} ${rulesString} failed to update.`
    : `${rules.length} ${rulesString} updated successfully.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);
  if (didRequestFail) {
    for (const rule of rules) {
      cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
    }
  } else {
    for (const rule of rules) {
      cy.get(rule['security-rule'].name).should('not.exist');
    }
  }
};

const interceptUpgradeRequestToFail = (
  rules: Array<typeof SAMPLE_PREBUILT_RULE>,
  didRequestFail: boolean
) => {
  if (didRequestFail) {
    cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform', {
      body: {
        summary: {
          succeeded: [],
          skipped: [],
          failed: rules.length,
        },
      },
    }).as('updatePrebuiltRules');
  }
};
