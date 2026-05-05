/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
} from '@kbn/security-solution-plugin/common/api/initialization';
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
        // Register the intercept after login so it captures the call fired by
        // visitAddRulesPage's provider mount, not earlier calls from the login
        // redirect chain whose responses can be lost across navigations.
        cy.intercept('POST', INITIALIZE_SECURITY_SOLUTION_URL, (req) => {
          // Only alias the call that includes the prebuilt rules package flow.
          // The frontend fires multiple initialization calls with different flows
          // and cy.wait would otherwise match the wrong one.
          if (!req.body?.flows?.includes(INITIALIZATION_FLOW_INIT_PREBUILT_RULES)) {
            return;
          }
          req.alias = 'initializeSecuritySolution';
        });

        visitAddRulesPage();

        // Expect the initialization endpoint to install the prebuilt rules package
        cy.wait('@initializeSecuritySolution', {
          timeout: PREBUILT_RULES_PACKAGE_INSTALLATION_TIMEOUT_MS,
        }).then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);

          const prebuiltRulesResult = response?.body.flows[INITIALIZATION_FLOW_INIT_PREBUILT_RULES];

          cy.wrap(prebuiltRulesResult).should('have.property', 'status', 'ready');
          cy.wrap(prebuiltRulesResult)
            .its('payload.name')
            .should('eql', 'security_detection_engine');

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
    });
  }
);
