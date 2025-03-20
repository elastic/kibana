/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expectToContainModifiedBadge,
  expectToNotContainModifiedBadge,
  importRulesWithOverwriteAll,
} from '../../../../tasks/alerts_detection_rules';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createAndInstallMockedPrebuiltRules } from '../../../../tasks/api_calls/prebuilt_rules';

import { login } from '../../../../tasks/login';

import { visitRulesManagementTable } from '../../../../tasks/rules_management';

const RULES_TO_IMPORT_FILENAME = 'cypress/fixtures/8_18_prebuilt_rules.ndjson';

describe(
  'Detection rules, Prebuilt Rules Import workflow - With Rule Customization',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    describe('when file is unmodified prebuilt rule with matching rule_id', () => {
      const PREBUILT_RULE_1 = createRuleAssetSavedObject({
        name: 'rule 1',
        rule_id: 'rule_1',
        version: 2,
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE_1]);
        visitRulesManagementTable();
      });

      it('can import the rule file', () => {
        importRulesWithOverwriteAll(RULES_TO_IMPORT_FILENAME);

        cy.wait('@import').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          cy.get(TOASTER).should('have.text', 'Successfully imported 1 rule');

          expectToNotContainModifiedBadge('rule 1');
        });
      });
    });

    describe('when file is modified prebuilt rule with matching rule_id', () => {
      const PREBUILT_RULE_1 = createRuleAssetSavedObject({
        name: 'original rule 1',
        rule_id: 'rule_1',
        version: 2,
      });

      beforeEach(() => {
        login();
        deleteAlertsAndRules();
        cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
        /* Create a new rule and install it */
        createAndInstallMockedPrebuiltRules([PREBUILT_RULE_1]);
        visitRulesManagementTable();
      });

      it('can import the rule file', () => {
        importRulesWithOverwriteAll(RULES_TO_IMPORT_FILENAME);

        cy.wait('@import').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          cy.get(TOASTER).should('have.text', 'Successfully imported 1 rule');

          expectToContainModifiedBadge('rule 1');
        });
      });
    });
  }
);
