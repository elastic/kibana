/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { expectedExportedRule, getNewRule } from '../../../../../objects/rule';
import {
  TOASTER_BODY,
  MODAL_CONFIRMATION_BODY,
  MODAL_CONFIRMATION_BTN,
  TOASTER,
} from '../../../../../screens/alerts_detection_rules';
import {
  filterByElasticRules,
  selectAllRules,
  waitForRuleExecution,
  exportRule,
  importRules,
  expectManagementTableRules,
} from '../../../../../tasks/alerts_detection_rules';
import { bulkExportRules } from '../../../../../tasks/rules_bulk_actions';
import {
  createExceptionList,
  deleteExceptionList,
} from '../../../../../tasks/api_calls/exceptions';
import { getExceptionList } from '../../../../../objects/exception';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { resetRulesTableState } from '../../../../../tasks/common';
import { login } from '../../../../../tasks/login';
import { visit } from '../../../../../tasks/navigation';

import { RULES_MANAGEMENT_URL } from '../../../../../urls/rules_management';
import {
  createAndInstallMockedPrebuiltRules,
  getAvailablePrebuiltRulesCount,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../../tasks/api_calls/prebuilt_rules';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';

const EXPORTED_RULES_FILENAME = 'rules_export.ndjson';
const exceptionList = getExceptionList();

const prebuiltRules = Array.from(Array(7)).map((_, i) => {
  return createRuleAssetSavedObject({
    name: `Test rule ${i + 1}`,
    rule_id: `rule_${i + 1}`,
  });
});

describe('Export rules', { tags: ['@ess', '@serverless'] }, () => {
  const downloadsFolder = Cypress.config('downloadsFolder');

  beforeEach(() => {
    login();
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    // Rules get exported via _bulk_action endpoint
    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
    // Prevent installation of whole prebuilt rules package, use mock prebuilt rules instead
    preventPrebuiltRulesPackageInstallation();
    visit(RULES_MANAGEMENT_URL);
    createRule(getNewRule({ name: 'Rule to export', enabled: false })).as('ruleResponse');
  });

  it('exports a custom rule', function () {
    exportRule('Rule to export');
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
    });
  });

  it('creates an importable file from executed rule', () => {
    // Rule needs to be enabled to make sure it has been executed so rule's SO contains runtime fields like `execution_summary`
    createRule(getNewRule({ name: 'Enabled rule to export', enabled: true }));
    waitForRuleExecution('Enabled rule to export');

    exportRule('Enabled rule to export');

    cy.get(TOASTER).should('have.text', 'Rules exported');
    cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');

    deleteAlertsAndRules();
    importRules(path.join(downloadsFolder, EXPORTED_RULES_FILENAME));

    cy.get(TOASTER).should('have.text', 'Successfully imported 1 rule');
    expectManagementTableRules(['Enabled rule to export']);
  });

  it('shows a modal saying that no rules can be exported if all the selected rules are prebuilt', function () {
    createAndInstallMockedPrebuiltRules(prebuiltRules);

    filterByElasticRules();
    selectAllRules();
    bulkExportRules();

    cy.get(MODAL_CONFIRMATION_BODY).contains(
      `${prebuiltRules.length} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
    );
  });

  it('exports only custom rules', function () {
    const expectedNumberCustomRulesToBeExported = 1;

    createAndInstallMockedPrebuiltRules(prebuiltRules);

    selectAllRules();
    bulkExportRules();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(MODAL_CONFIRMATION_BODY).contains(
        `${availablePrebuiltRulesCount} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
      );
    });

    // proceed with exporting only custom rules
    cy.get(MODAL_CONFIRMATION_BTN)
      .should('have.text', `Export ${expectedNumberCustomRulesToBeExported} custom rule`)
      .click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      const totalNumberOfRules =
        expectedNumberCustomRulesToBeExported + availablePrebuiltRulesCount;
      cy.get(TOASTER_BODY).should(
        'contain',
        `Successfully exported ${expectedNumberCustomRulesToBeExported} of ${totalNumberOfRules} rules. Prebuilt rules were excluded from the resulting file.`
      );
    });
  });

  context('rules with exceptions', () => {
    beforeEach(() => {
      deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) =>
        createRule(
          getNewRule({
            name: 'rule with exceptions',
            exceptions_list: [
              {
                id: response.body.id,
                list_id: exceptionList.list_id,
                type: exceptionList.type,
                namespace_type: exceptionList.namespace_type,
              },
            ],
            rule_id: '2',
            enabled: false,
          })
        )
      );
    });

    it('exports custom rules with exceptions', function () {
      // one rule with exception, one without it
      const expectedNumberCustomRulesToBeExported = 2;

      createAndInstallMockedPrebuiltRules(prebuiltRules);
      cy.reload();
      selectAllRules();
      bulkExportRules();

      // should display correct number of custom rules when one of them has exceptions
      cy.get(MODAL_CONFIRMATION_BTN)
        .should('have.text', `Export ${expectedNumberCustomRulesToBeExported} custom rules`)
        .click();

      cy.get(TOASTER_BODY).should(
        'contain',
        `Successfully exported ${expectedNumberCustomRulesToBeExported}`
      );
    });
  });
});
