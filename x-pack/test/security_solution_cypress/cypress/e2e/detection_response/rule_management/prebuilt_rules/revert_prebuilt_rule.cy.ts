/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_CUSTOMIZATIONS_DIFF_FLYOUT } from '../../../../screens/rule_details_flyout';
import { RULE_UPGRADE_PER_FIELD_DIFF_LABEL } from '../../../../screens/rule_updates';
import { POPOVER_ACTIONS_TRIGGER_BUTTON, RULE_NAME_HEADER } from '../../../../screens/rule_details';
import { getIndexPatterns, getNewRule } from '../../../../objects/rule';
import {
  expectModifiedRuleBadgeToNotBeDisplayed,
  revertRuleFromDetailsPage,
} from '../../../../tasks/alerts_detection_rules';
import {
  RULE_DETAILS_REVERT_RULE_BTN,
  RULE_DETAILS_REVERT_RULE_TOOLTIP,
  RULE_NAME,
  TOASTER_MESSAGE,
} from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import {
  createAndInstallMockedPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { createRule, patchRule } from '../../../../tasks/api_calls/rules';

import { login } from '../../../../tasks/login';

import { visitRulesManagementTable } from '../../../../tasks/rules_management';
describe(
  'Detection rules, Prebuilt Rules reversion workflow',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },

  () => {
    describe('Reverting prebuilt rules', () => {
      const PREBUILT_RULE = createRuleAssetSavedObject({
        name: 'Non-customized prebuilt rule',
        rule_id: 'rule_1',
        version: 1,
        index: getIndexPatterns(),
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        deletePrebuiltRulesAssets();
        preventPrebuiltRulesPackageInstallation();
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE]);
        visitRulesManagementTable();
      });

      it('reverts customized prebuilt rule to current Elastic version', function () {
        patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();

        revertRuleFromDetailsPage();
        expectModifiedRuleBadgeToNotBeDisplayed();

        cy.get(RULE_NAME_HEADER).should('contain', 'Non-customized prebuilt rule'); // Correctly displays reverted title
      });

      it('shows diff between current and original Elastic rule versions in flyout', function () {
        patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();

        cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).click();

        cy.get(RULE_UPGRADE_PER_FIELD_DIFF_LABEL).should('have.text', 'Name');
      });

      it("doesn't close diff flyout on concurrency errors", function () {
        patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();

        cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).click();

        patchRule('rule_1', { description: 'customized description' }); // Customize another field to iterate revision field
        revertRuleFromDetailsPage();

        cy.get(RULE_CUSTOMIZATIONS_DIFF_FLYOUT).should('exist'); // Flyout shouldn't be closed
        cy.get(TOASTER_MESSAGE).should(
          'have.text',
          'Something in the rule object has changed before reversion was completed. Please review the updated diff and try again.'
        );
      });

      it(`disables "Revert prebuilt rule" button when rule's base version is missing`, function () {
        patchRule('rule_1', { name: 'Customized prebuilt rule' }); // We want to make this a customized prebuilt rule
        deletePrebuiltRulesAssets(); // Delete the base version of the prebuilt rule

        cy.get(RULE_NAME).contains('Customized prebuilt rule').click();

        cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).should('be.disabled');
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).trigger('mouseover', { force: true }); // Have to force because button element is disabled
        cy.get(RULE_DETAILS_REVERT_RULE_TOOLTIP).should('exist');
      });

      it(`hides "Revert prebuilt rule" button appear when rule is non-customzied`, function () {
        cy.get(RULE_NAME).contains('Non-customized prebuilt rule').click();

        cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).should('not.exist');
      });

      it(`hides "Revert prebuilt rule" button appear when rule is not prebuilt`, function () {
        createRule(
          getNewRule({
            name: 'Custom rule',
            index: getIndexPatterns(),
            enabled: false,
          })
        );
        cy.get(RULE_NAME).contains('Custom rule').click();

        cy.get(POPOVER_ACTIONS_TRIGGER_BUTTON).click();
        cy.get(RULE_DETAILS_REVERT_RULE_BTN).should('not.exist');
      });
    });
  }
);
