/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULES_BULK_EDIT_DATA_VIEWS_WARNING,
  RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX,
} from '../../../../../screens/rules_bulk_actions';

import { DATA_VIEW_DETAILS, INDEX_PATTERNS_DETAILS } from '../../../../../screens/rule_details';

import {
  goToRuleDetails,
  goToTheRuleDetailsOf,
  expectManagementTableRules,
  selectAllRules,
  getRulesManagementTableRows,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';

import {
  typeIndexPatterns,
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  checkOverwriteDataViewCheckbox,
  checkOverwriteIndexPatternsCheckbox,
  openBulkEditAddIndexPatternsForm,
  openBulkEditDeleteIndexPatternsForm,
} from '../../../../../tasks/rules_bulk_actions';

import {
  hasIndexPatterns,
  getDetails,
  assertDetailsNotExist,
} from '../../../../../tasks/rule_details';
import { login, visitSecurityDetectionRulesPage } from '../../../../../tasks/login';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules, postDataView } from '../../../../../tasks/common';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getNewTermsRule,
} from '../../../../../objects/rule';

const DATA_VIEW_ID = 'auditbeat';

const expectedIndexPatterns = ['index-1-*', 'index-2-*'];

describe(
  'Bulk editing index patterns of rules with a data view only',
  { tags: ['@ess', '@brokenInServerless'] },
  () => {
    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');
      login();

      postDataView(DATA_VIEW_ID);

      createRule(
        getNewRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          rule_id: '1',
          name: 'New Rule Test 1',
          enabled: false,
        })
      );
      createRule(
        getEqlRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          rule_id: '2',
          name: 'New EQL Rule',
          enabled: false,
        })
      );
      createRule(
        getNewThreatIndicatorRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          rule_id: '3',
          name: 'Threat Indicator Rule Test',
          enabled: false,
        })
      );
      createRule(
        getNewThresholdRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          rule_id: '4',
          name: 'Threshold Rule',
          enabled: false,
        })
      );
      createRule(
        getNewTermsRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          rule_id: '5',
          name: 'New Terms Rule',
          enabled: false,
        })
      );
      createRule(
        getNewRule({
          index: undefined,
          data_view_id: DATA_VIEW_ID,
          saved_id: 'mocked',
          rule_id: '6',
          name: 'New Rule Test 2',
          enabled: false,
        })
      );

      visitSecurityDetectionRulesPage();
      disableAutoRefresh();

      expectManagementTableRules([
        'New Rule Test 1',
        'New EQL Rule',
        'Threat Indicator Rule Test',
        'Threshold Rule',
        'New Terms Rule',
        'New Rule Test 2',
      ]);
    });

    it('Add index patterns to custom rules with configured data view: all rules are skipped', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(expectedIndexPatterns);
        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          skippedCount: rows.length,
          showDataViewsWarning: true,
        });

        // check if rule still has data view and index patterns field does not exist
        goToRuleDetails();
        getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
        assertDetailsNotExist(INDEX_PATTERNS_DETAILS);
      });
    });

    it('Add index patterns to custom rules with configured data view when data view checkbox is checked: rules are updated', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(expectedIndexPatterns);

        // click on data view overwrite checkbox, ensure warning is displayed
        cy.get(RULES_BULK_EDIT_DATA_VIEWS_WARNING).should('not.exist');
        checkOverwriteDataViewCheckbox();
        cy.get(RULES_BULK_EDIT_DATA_VIEWS_WARNING).should('be.visible');

        submitBulkEditForm();

        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if rule has been updated with index patterns and data view does not exist
        goToRuleDetails();
        hasIndexPatterns(expectedIndexPatterns.join(''));
        assertDetailsNotExist(DATA_VIEW_DETAILS);
      });
    });

    it('Overwrite index patterns in custom rules with configured data view when overwrite data view checkbox is NOT checked:: rules are skipped', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(expectedIndexPatterns);
        checkOverwriteIndexPatternsCheckbox();
        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          skippedCount: rows.length,
          showDataViewsWarning: true,
        });

        // check if rule still has data view and index patterns field does not exist
        goToRuleDetails();
        getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
        assertDetailsNotExist(INDEX_PATTERNS_DETAILS);
      });
    });

    it('Overwrite index patterns in custom rules with configured data view when overwrite data view checkbox is checked: rules are updated', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();

        openBulkEditAddIndexPatternsForm();
        typeIndexPatterns(expectedIndexPatterns);
        checkOverwriteIndexPatternsCheckbox();
        checkOverwriteDataViewCheckbox();

        submitBulkEditForm();

        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if rule has been overwritten with index patterns and data view does not exist
        goToRuleDetails();
        hasIndexPatterns(expectedIndexPatterns.join(''));
        assertDetailsNotExist(DATA_VIEW_DETAILS);
      });
    });

    it('Delete index patterns in custom rules with configured data view: rules are skipped', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();

        openBulkEditDeleteIndexPatternsForm();
        typeIndexPatterns(expectedIndexPatterns);

        // in delete form data view checkbox is absent
        cy.get(RULES_BULK_EDIT_OVERWRITE_DATA_VIEW_CHECKBOX).should('not.exist');

        submitBulkEditForm();

        waitForBulkEditActionToFinish({
          skippedCount: rows.length,
          showDataViewsWarning: true,
        });

        // check if rule still has data view and index patterns field does not exist
        goToRuleDetails();
        getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
      });
    });
  }
);

describe(
  'Bulk editing index patterns of rules with index patterns and rules with a data view',
  { tags: ['@ess', '@brokenInServerless'] },
  () => {
    before(() => {
      cleanKibana();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      cy.task('esArchiverResetKibana');

      postDataView(DATA_VIEW_ID);

      createRule(
        getNewRule({ name: 'with dataview', index: [], data_view_id: DATA_VIEW_ID, rule_id: '1' })
      );
      createRule(getNewRule({ name: 'no data view', index: ['test-index-1-*'], rule_id: '2' }));

      visitSecurityDetectionRulesPage();
      disableAutoRefresh();

      expectManagementTableRules(['with dataview', 'no data view']);
    });

    it('Add index patterns to custom rules: one rule is updated, one rule is skipped', () => {
      selectAllRules();

      openBulkEditAddIndexPatternsForm();
      typeIndexPatterns(expectedIndexPatterns);
      submitBulkEditForm();

      waitForBulkEditActionToFinish({
        updatedCount: 1,
        skippedCount: 1,
        showDataViewsWarning: true,
      });

      // check if rule still has data view and index patterns field does not exist
      goToTheRuleDetailsOf('with dataview');
      getDetails(DATA_VIEW_DETAILS).contains(DATA_VIEW_ID);
      assertDetailsNotExist(INDEX_PATTERNS_DETAILS);
    });

    it('Add index patterns to custom rules when overwrite data view checkbox is checked: all rules are updated', () => {
      selectAllRules();

      openBulkEditAddIndexPatternsForm();
      typeIndexPatterns(expectedIndexPatterns);
      checkOverwriteDataViewCheckbox();
      submitBulkEditForm();

      waitForBulkEditActionToFinish({
        updatedCount: 2,
      });

      // check if rule still has data view and index patterns field does not exist
      goToRuleDetails();
      assertDetailsNotExist(DATA_VIEW_DETAILS);
    });
  }
);
