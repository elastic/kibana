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
  getInstallSingleRuleLoadingSpinnerByRuleId,
  getUpgradeSingleRuleLoadingSpinnerByRuleId,
  RULES_MANAGEMENT_TABLE,
  RULES_UPDATES_TAB,
  RULES_UPDATES_TABLE,
  TOASTER,
} from '../screens/alerts_detection_rules';
import { RULE_MANAGEMENT_PAGE_BREADCRUMB } from '../screens/breadcrumbs';
import type { SAMPLE_PREBUILT_RULE } from './api_calls/prebuilt_rules';

export const addElasticRulesButtonClick = () => {
  cy.get(ADD_ELASTIC_RULES_BTN).click();
  cy.location('pathname').should('include', RULES_ADD_PATH);
};

export const ruleUpdatesTabClick = () => {
  cy.get(RULES_UPDATES_TAB).click();
  cy.location('pathname').should('include', RULES_UPDATES);
};

export const assertInstallationRequestIsComplete = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  for (const rule of rules) {
    cy.get(getInstallSingleRuleLoadingSpinnerByRuleId(rule['security-rule'].rule_id)).should(
      'exist'
    );
  }
  for (const rule of rules) {
    cy.get(getInstallSingleRuleLoadingSpinnerByRuleId(rule['security-rule'].rule_id)).should(
      'not.exist'
    );
  }
};

export const assertUpgradeRequestIsComplete = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  for (const rule of rules) {
    cy.get(getUpgradeSingleRuleLoadingSpinnerByRuleId(rule['security-rule'].rule_id)).should(
      'exist'
    );
  }
  for (const rule of rules) {
    cy.get(getUpgradeSingleRuleLoadingSpinnerByRuleId(rule['security-rule'].rule_id)).should(
      'not.exist'
    );
  }
};

/**
 * Assert that when the rule installation succeeds, the toast is shown with the right message
 * -confirming the succesful install- and subsequently check that the rules available for installation
 * are not present in the Add Elastic Rules table anymore
 */
export const assertInstallationSuccess = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = `${rules.length} ${rulesString} installed successfully.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);

  // Go back to rules table and assert that the rules are installed
  cy.get(RULE_MANAGEMENT_PAGE_BREADCRUMB).click();
  for (const rule of rules) {
    cy.get(RULES_MANAGEMENT_TABLE).contains(rule['security-rule'].name);
  }
};

/**
 * Assert that when the rule installation fails, the toast is shown with the right message
 * -notifying that the installation failed- and subsequently check that the rules available for installation
 * are still present in the Rule Update table
 */
export const assertInstallationFailure = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = `${rules.length} ${rulesString} failed to install.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);

  // Check rules are still available for install
  for (const rule of rules) {
    cy.get(ADD_ELASTIC_RULES_TABLE).contains(rule['security-rule'].name);
  }
};

export const interceptInstallationRequestToFail = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/installation/_perform', {
    body: {
      summary: {
        succeeded: [],
        skipped: [],
        failed: rules.length,
      },
    },
    delay: 500, // Add delay to give Cypress time to find the loading spinner
  }).as('installPrebuiltRules');
};

/**
 * Assert that when the rule version upgrade succeeds, the toast is shown with the right message
 * -confirming the succesful upgrade- and subsequently check that the rules available for upgrade
 * are not present in the Rule Update table anymore
 */
export const assertUpgradeSuccess = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = `${rules.length} ${rulesString} updated successfully.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);
  for (const rule of rules) {
    cy.get(rule['security-rule'].name).should('not.exist');
  }
};

/**
 * Assert that when the rule version upgrade fails, the toast is shown with the right message
 * -notifying that the upgrade failed- and subsequently check that the rules available for upgrade
 * are still present in the Rule Update table
 */
export const assertUpgradeFailure = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  const rulesString = rules.length > 1 ? 'rules' : 'rule';
  const toastMessage = `${rules.length} ${rulesString} failed to update.`;
  cy.get(TOASTER).should('be.visible').should('have.text', toastMessage);

  for (const rule of rules) {
    cy.get(RULES_UPDATES_TABLE).contains(rule['security-rule'].name);
  }
};

export const interceptUpgradeRequestToFail = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) => {
  cy.intercept('POST', '/internal/detection_engine/prebuilt_rules/upgrade/_perform', {
    body: {
      summary: {
        succeeded: [],
        skipped: [],
        failed: rules.length,
      },
    },
    delay: 500, // Add delay to give Cypress time to find the loading spinner
  }).as('updatePrebuiltRules');
};
