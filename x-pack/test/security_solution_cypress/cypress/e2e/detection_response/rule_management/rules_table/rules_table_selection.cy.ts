/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  SELECTED_RULES_NUMBER_LABEL,
  SELECT_ALL_RULES_BTN,
  SELECT_ALL_RULES_ON_PAGE_CHECKBOX,
} from '../../../../screens/alerts_detection_rules';
import {
  disableAutoRefresh,
  selectRulesByName,
  unselectRulesByName,
  waitForPrebuiltDetectionRulesToBeLoaded,
} from '../../../../tasks/alerts_detection_rules';
import {
  getAvailablePrebuiltRulesCount,
  createAndInstallMockedPrebuiltRules,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';

const RULE_1 = createRuleAssetSavedObject({
  name: 'Test rule 1',
  rule_id: 'rule_1',
});
const RULE_2 = createRuleAssetSavedObject({
  name: 'Test rule 2',
  rule_id: 'rule_2',
});

describe('Rules table: selection', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    /* Create and install two mock rules */
    createAndInstallMockedPrebuiltRules([RULE_1, RULE_2]);
    visit(RULES_MANAGEMENT_URL);
    waitForPrebuiltDetectionRulesToBeLoaded();
    disableAutoRefresh();
  });

  it('should correctly update the selection label when rules are individually selected and unselected', () => {
    waitForPrebuiltDetectionRulesToBeLoaded();

    selectRulesByName(['Test rule 1', 'Test rule 2']);

    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '2');

    unselectRulesByName(['Test rule 1', 'Test rule 2']);

    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
  });

  it('should correctly update the selection label when rules are bulk selected and then bulk un-selected', () => {
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(SELECT_ALL_RULES_BTN).click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', availablePrebuiltRulesCount);
    });

    // Un-select all rules via the Bulk Selection button from the Utility bar
    cy.get(SELECT_ALL_RULES_BTN).click();

    // Current selection should be 0 rules
    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
    // Bulk selection button should be back to displaying all rules
    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', availablePrebuiltRulesCount);
    });
  });

  it('should correctly update the selection label when rules are bulk selected and then unselected via the table select all checkbox', () => {
    waitForPrebuiltDetectionRulesToBeLoaded();

    cy.get(SELECT_ALL_RULES_BTN).click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', availablePrebuiltRulesCount);
    });

    // Un-select all rules via the Un-select All checkbox from the table
    cy.get(SELECT_ALL_RULES_ON_PAGE_CHECKBOX).click();

    // Current selection should be 0 rules
    cy.get(SELECTED_RULES_NUMBER_LABEL).should('contain.text', '0');
    // Bulk selection button should be back to displaying all rules
    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(SELECT_ALL_RULES_BTN).should('contain.text', availablePrebuiltRulesCount);
    });
  });
});
