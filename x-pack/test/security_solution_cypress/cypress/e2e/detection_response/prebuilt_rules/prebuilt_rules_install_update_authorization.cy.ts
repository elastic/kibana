/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  APP_PATH,
  RULES_ADD_PATH,
  RULES_UPDATES,
} from '@kbn/security-solution-plugin/common/constants';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { tag } from '../../../tags';

import { createRuleAssetSavedObject } from '../../../helpers/rules';
import { waitForRulesTableToBeLoaded } from '../../../tasks/alerts_detection_rules';
import { createAndInstallMockedPrebuiltRules } from '../../../tasks/api_calls/prebuilt_rules';
import { resetRulesTableState, deleteAlertsAndRules } from '../../../tasks/common';
import { login, waitForPageWithoutDateRange } from '../../../tasks/login';
import { SECURITY_DETECTIONS_RULES_URL } from '../../../urls/navigation';
import {
  ADD_ELASTIC_RULES_BTN,
  getInstallSingleRuleButtonByRuleId,
  getUpgradeSingleRuleButtonByRuleId,
  INSTALL_ALL_RULES_BUTTON,
  RULES_UPDATES_TAB,
  RULE_CHECKBOX,
  UPGRADE_ALL_RULES_BUTTON,
} from '../../../screens/alerts_detection_rules';

const RULE_1_ID = 'rule_1';
const RULE_2_ID = 'rule_2';
const OUTDATED_RULE_1 = createRuleAssetSavedObject({
  name: 'Outdated rule 1',
  rule_id: RULE_1_ID,
  version: 1,
});
const UPDATED_RULE_1 = createRuleAssetSavedObject({
  name: 'Updated rule 1',
  rule_id: RULE_1_ID,
  version: 2,
});
const OUTDATED_RULE_2 = createRuleAssetSavedObject({
  name: 'Outdated rule 2',
  rule_id: RULE_2_ID,
  version: 1,
});
const UPDATED_RULE_2 = createRuleAssetSavedObject({
  name: 'Updated rule 2',
  rule_id: RULE_2_ID,
  version: 2,
});

const loadPageAsReadOnlyUser = (url: string) => {
  login(ROLES.reader);
  waitForPageWithoutDateRange(url, ROLES.reader);
};

describe(
  'Detection rules, Prebuilt Rules Installation and Update - Authorization/RBAC',
  { tags: tag.ESS },
  () => {
    beforeEach(() => {
      login();
      resetRulesTableState();
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');
      waitForRulesTableToBeLoaded();
      createAndInstallMockedPrebuiltRules({ rules: [OUTDATED_RULE_1, OUTDATED_RULE_2] });
    });

    describe('User with read privileges on Security Solution', () => {
      const RULE_1 = createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      });
      const RULE_2 = createRuleAssetSavedObject({
        name: 'Test rule 2',
        rule_id: 'rule_2',
      });
      beforeEach(() => {
        // Now login with read-only user in preparation for test
        createAndInstallMockedPrebuiltRules({ rules: [RULE_1, RULE_2], installToKibana: false });
        loadPageAsReadOnlyUser(SECURITY_DETECTIONS_RULES_URL);
        waitForRulesTableToBeLoaded();
      });

      it('should not be able to install prebuilt rules', () => {
        // Check that Add Elastic Rules button is disabled
        cy.get(ADD_ELASTIC_RULES_BTN).should('be.disabled');

        // Navigate to Add Elastic Rules page anyways via URL
        // and assert that rules cannot be selected and all
        // installation buttons are disabled
        cy.visit(`${APP_PATH}${RULES_ADD_PATH}`);
        cy.get(INSTALL_ALL_RULES_BUTTON).should('be.disabled');
        cy.get(getInstallSingleRuleButtonByRuleId(RULE_1['security-rule'].rule_id)).should(
          'not.exist'
        );
        cy.get(RULE_CHECKBOX).should('not.exist');
      });
    });

    describe('User with read privileges on Security Solution', () => {
      beforeEach(() => {
        /* Create a second version of the rule, making it available for update */
        createAndInstallMockedPrebuiltRules({
          rules: [UPDATED_RULE_1, UPDATED_RULE_2],
          installToKibana: false,
        });
        // Now login with read-only user in preparation for test
        loadPageAsReadOnlyUser(SECURITY_DETECTIONS_RULES_URL);
        waitForRulesTableToBeLoaded();
      });

      it('should not be able to upgrade prebuilt rules', () => {
        // Check that Rule Update tab is not shown
        cy.get(RULES_UPDATES_TAB).should('not.exist');

        // Navigate to Rule Update tab anyways via URL
        // and assert that rules cannot be selected and all
        // upgrade buttons are disabled
        cy.visit(`${APP_PATH}${RULES_UPDATES}`);
        cy.get(UPGRADE_ALL_RULES_BUTTON).should('be.disabled');
        cy.get(getUpgradeSingleRuleButtonByRuleId(OUTDATED_RULE_1['security-rule'].rule_id)).should(
          'not.exist'
        );
        cy.get(RULE_CHECKBOX).should('not.exist');
      });
    });
  }
);
