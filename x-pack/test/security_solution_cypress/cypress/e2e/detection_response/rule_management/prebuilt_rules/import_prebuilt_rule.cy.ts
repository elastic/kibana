/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expectManagementTableRules,
  importRules,
  importRulesWithOverwriteAll,
} from '../../../../tasks/alerts_detection_rules';
import { TOASTER } from '../../../../screens/alerts_detection_rules';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { combineToNdJson } from '../../../../helpers/ndjson';
import {
  deleteAlertsAndRules,
  deletePrebuiltRulesAssets,
} from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  installMockPrebuiltRulesPackage,
  installPrebuiltRuleAssets,
  installSpecificPrebuiltRulesRequest,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';

describe(
  'Detection rules, Prebuilt Rules Import workflow - With Rule Customization',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deletePrebuiltRulesAssets();
      cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    });

    const [PREBUILT_RULE_ID_A, PREBUILT_RULE_ID_B] = ['prebuilt-rule-a', 'prebuilt-rule-b'];
    const PREBUILT_RULE_A = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_A,
      version: 2,
      name: 'Stock rule name A',
      description: 'Stock rule description A',
    });
    const PREBUILT_RULE_B = createRuleAssetSavedObject({
      rule_id: PREBUILT_RULE_ID_B,
      version: 3,
      name: 'Stock rule name B',
      description: 'Stock rule description B',
    });
    const CUSTOM_RULE = getCustomQueryRuleParams({
      rule_id: 'rule-1',
      name: 'Custom rule',
    });
    const IMPORT_PAYLOAD = combineToNdJson(
      {
        ...PREBUILT_RULE_A['security-rule'],
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      },
      {
        ...PREBUILT_RULE_B['security-rule'],
        name: 'Customized Prebuilt Rule',
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: true,
        },
      },
      CUSTOM_RULE
    );

    describe('without override', () => {
      it('imports a mixture of new prebuilt and custom rules', () => {
        installPrebuiltRuleAssets([PREBUILT_RULE_A, PREBUILT_RULE_B]);
        visitRulesManagementTable();

        importRules({
          contents: Cypress.Buffer.from(IMPORT_PAYLOAD),
          fileName: 'mix_of_prebuilt_and_custom_rules.ndjson',
          mimeType: 'application/x-ndjson',
        });

        cy.wait('@import').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          cy.get(TOASTER).should('have.text', 'Successfully imported 3 rules');

          expectManagementTableRules([
            'Stock rule name A',
            'Customized Prebuilt Rule',
            'Custom rule',
          ]);
        });
      });
    });

    describe('with override (prebuilt rules installed)', () => {
      it('imports a mixture of new prebuilt and custom rules', () => {
        createRule(CUSTOM_RULE);
        installPrebuiltRuleAssets([PREBUILT_RULE_A, PREBUILT_RULE_B]);
        installSpecificPrebuiltRulesRequest([PREBUILT_RULE_A, PREBUILT_RULE_B]);
        visitRulesManagementTable();

        importRulesWithOverwriteAll({
          contents: Cypress.Buffer.from(IMPORT_PAYLOAD),
          fileName: 'mix_of_prebuilt_and_custom_rules.ndjson',
          mimeType: 'application/x-ndjson',
        });

        cy.wait('@import').then(({ response }) => {
          cy.wrap(response?.statusCode).should('eql', 200);
          cy.get(TOASTER).should('have.text', 'Successfully imported 3 rules');

          expectManagementTableRules([
            'Stock rule name A',
            'Customized Prebuilt Rule',
            'Custom rule',
          ]);
        });
      });
    });
  }
);
