/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BOOTSTRAP_PREBUILT_RULES_URL } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { installSinglePrebuiltRule } from '../../../../tasks/prebuilt_rules/install_prebuilt_rules';
import { resetRulesTableState } from '../../../../tasks/common';
import { RULE_NAME } from '../../../../screens/alerts_detection_rules';
import { deletePrebuiltRulesFleetPackage } from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import { visitAddRulesPage, visitRulesManagementTable } from '../../../../tasks/rules_management';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { expectManagementTableRules } from '../../../../tasks/alerts_detection_rules';

const PREBUILT_RULES_PACKAGE_INSTALLATION_TIMEOUT_MS = 120000; // 2 minutes

describe(
  'Detection rules, Prebuilt Rules Installation and Update workflow',
  { tags: ['@ess', '@serverless'] },
  () => {
    describe('Installation of prebuilt rules package via Fleet', () => {
      beforeEach(() => {
        deletePrebuiltRulesFleetPackage();
        resetRulesTableState();
        deleteAlertsAndRules();

        cy.intercept('POST', BOOTSTRAP_PREBUILT_RULES_URL).as('bootstrapPrebuiltRules');

        login();
      });

      it('should install prebuilt rules from the Fleet package', () => {
        visitAddRulesPage();

        // Expect the package to be installed
        cy.wait('@bootstrapPrebuiltRules', {
          timeout: PREBUILT_RULES_PACKAGE_INSTALLATION_TIMEOUT_MS,
        }).then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);

          const securityDetectionEnginePackage = response?.body.packages.find(
            (pkg: { name: string }) => pkg.name === 'security_detection_engine'
          );

          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(
            securityDetectionEnginePackage,
            'Bootstrap endpoint must return "security_detection_engine" package info.'
          ).to.exist;
          expect(
            securityDetectionEnginePackage,
            '"security_detection_engine" package must be just installed'
          ).includes({
            name: 'security_detection_engine',
            status: 'installed',
          });

          // Install some prebuilt rules
          cy.get<JQuery<HTMLElement>>(RULE_NAME).then(($ruleNames) => {
            const ruleNames = $ruleNames.get().map((x) => x.innerText);

            installSinglePrebuiltRule(ruleNames[0]);
            installSinglePrebuiltRule(ruleNames[1]);
            installSinglePrebuiltRule(ruleNames[2]);

            visitRulesManagementTable();

            expectManagementTableRules([ruleNames[0], ruleNames[1], ruleNames[2]]);
          });
        });
      });
    });
  }
);
