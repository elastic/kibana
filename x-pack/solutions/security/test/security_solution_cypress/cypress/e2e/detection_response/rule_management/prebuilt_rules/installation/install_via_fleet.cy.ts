/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { installSinglePrebuiltRule } from '../../../../../tasks/prebuilt_rules/install_prebuilt_rules';
import { resetRulesTableState } from '../../../../../tasks/common';
import { RULE_NAME } from '../../../../../screens/alerts_detection_rules';
import { deletePrebuiltRulesFleetPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../../tasks/login';
import {
  visitAddRulesPage,
  visitRulesManagementTable,
} from '../../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { expectManagementTableRules } from '../../../../../tasks/alerts_detection_rules';

const PREBUILT_RULES_PACKAGE_INSTALLATION_TIMEOUT_MS = 120000; // 2 minutes

describe(
  'Detection rules, Prebuilt Rules Installation Workflow (Real package)',
  { tags: ['@ess', '@serverless'] },
  () => {
    describe('Installation of prebuilt rules package via Fleet', () => {
      beforeEach(() => {
        deletePrebuiltRulesFleetPackage();
        resetRulesTableState();
        deleteAlertsAndRules();

        login();
      });

      it('installs prebuilt rules from the "security_detection_engine" Fleet package', () => {
        visitAddRulesPage();

        // Wait for the rules table to populate — the UI signal that the
        // prebuilt rules package finished initializing. Server-contract
        // assertions live in the API integration tests.
        cy.get<JQuery<HTMLElement>>(RULE_NAME, {
          timeout: PREBUILT_RULES_PACKAGE_INSTALLATION_TIMEOUT_MS,
        }).should('have.length.at.least', 1);

        // Install the first 3 visible prebuilt rules one at a time.
        cy.get<JQuery<HTMLElement>>(RULE_NAME).then(($rules) => {
          const ruleNames = $rules
            .toArray()
            .slice(0, 3)
            .map((el) => el.innerText);

          ruleNames.forEach((name) => installSinglePrebuiltRule(name));

          visitRulesManagementTable();

          expectManagementTableRules(ruleNames);
        });
      });
    });
  }
);
