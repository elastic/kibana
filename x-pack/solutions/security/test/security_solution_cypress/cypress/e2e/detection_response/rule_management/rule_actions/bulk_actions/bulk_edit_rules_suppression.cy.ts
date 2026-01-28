/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { installMockPrebuiltRulesPackage } from '../../../../../tasks/api_calls/prebuilt_rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { MODAL_CONFIRMATION_BODY } from '../../../../../screens/alerts_detection_rules';
import { RULES_BULK_EDIT_FORM_TITLE } from '../../../../../screens/rules_bulk_actions';

import {
  DEFINITION_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../../screens/rule_details';

import {
  selectAllRules,
  goToRuleDetailsOf,
  getRulesManagementTableRows,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';

import {
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  clickSetAlertSuppressionMenuItem,
  confirmBulkEditAction,
  clickSetAlertSuppressionForThresholdMenuItem,
  clickDeleteAlertSuppressionMenuItem,
} from '../../../../../tasks/rules_bulk_actions';

import {
  fillAlertSuppressionFields,
  selectAlertSuppressionPerInterval,
  setAlertSuppressionDuration,
  selectDoNotSuppressForMissingFields,
} from '../../../../../tasks/create_new_rule';

import { getDetails, assertDetailsNotExist } from '../../../../../tasks/rule_details';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';
import { createRule } from '../../../../../tasks/api_calls/rules';

import {
  getEqlRule,
  getNewThreatIndicatorRule as getNewIMRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
  getEsqlRule,
} from '../../../../../objects/rule';

const queryRule = getNewRule({ rule_id: '1', name: 'Query rule', enabled: false });
const eqlRule = getEqlRule({ rule_id: '2', name: 'EQL Rule', enabled: false });
const mlRule = getMachineLearningRule({ rule_id: '3', name: 'ML Rule', enabled: false });
const imRule = getNewIMRule({ rule_id: '4', name: 'IM Rule', enabled: false });
const newTermsRule = getNewTermsRule({ rule_id: '5', name: 'New Terms Rule', enabled: false });
const esqlRule = getEsqlRule({ rule_id: '6', name: 'ES|QL Rule', enabled: false });
const thresholdRule = getNewThresholdRule({ rule_id: '7', name: 'Threshold Rule', enabled: false });

describe('Bulk Edit - Alert Suppression', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    installMockPrebuiltRulesPackage();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
  });

  describe('Rules without suppression', () => {
    beforeEach(() => {
      createRule(queryRule);
      createRule(eqlRule);
      createRule(mlRule);
      createRule(imRule);
      createRule(newTermsRule);
      createRule(esqlRule);
      createRule(thresholdRule);

      visitRulesManagementTable();
      disableAutoRefresh();
    });

    it('Set alert suppression', () => {
      const skippedCount = 1; // Threshold rule is skipped
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickSetAlertSuppressionMenuItem();

        cy.get(MODAL_CONFIRMATION_BODY).contains(
          `${skippedCount} threshold rule can't be edited. To bulk-apply alert suppression to this rule, use the Apply alert suppression to threshold rules option.`
        );

        confirmBulkEditAction();

        cy.get(RULES_BULK_EDIT_FORM_TITLE).should('have.text', 'Apply alert suppression');

        fillAlertSuppressionFields(['source.ip']);
        selectAlertSuppressionPerInterval();
        setAlertSuppressionDuration(2, 'h');
        selectDoNotSuppressForMissingFields();

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length - skippedCount });

        // check if one of the rules has been updated
        goToRuleDetailsOf(eqlRule.name);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', 'source.ip');
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '2h');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });
      });
    });

    it('Set alert suppression for threshold rules', () => {
      const skippedCount = 6; // Non threshold rules are skipped
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickSetAlertSuppressionForThresholdMenuItem();

        cy.get(MODAL_CONFIRMATION_BODY).contains(
          `${skippedCount} rules can't be edited. To bulk-apply alert suppression to these rules, use the Apply alert suppression option.`
        );

        confirmBulkEditAction();

        cy.get(RULES_BULK_EDIT_FORM_TITLE).should(
          'have.text',
          'Apply alert suppression to threshold rules'
        );

        setAlertSuppressionDuration(50, 'm');

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length - skippedCount });

        // check if one of the rules has been updated
        goToRuleDetailsOf(thresholdRule.name);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '50m');
        });
      });
    });
  });

  describe('Rules with suppression', () => {
    beforeEach(() => {
      const commonOverrides = {
        alert_suppression: {
          group_by: ['destination.ip'],
          duration: { value: 30, unit: 'm' as const },
          missing_fields_strategy: 'suppress' as const,
        },
        enabled: false,
      };

      createRule({ ...queryRule, ...commonOverrides });
      createRule({ ...eqlRule, ...commonOverrides });
      createRule({ ...mlRule, ...commonOverrides });
      createRule({ ...imRule, ...commonOverrides });
      createRule({ ...newTermsRule, ...commonOverrides });
      createRule({ ...esqlRule, ...commonOverrides });
      createRule({
        ...thresholdRule,
        enabled: false,
        alert_suppression: { duration: { value: 1, unit: 'h' as const } },
      });

      visitRulesManagementTable();
      disableAutoRefresh();
    });

    it('Delete alert suppression', () => {
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickDeleteAlertSuppressionMenuItem();

        cy.get(MODAL_CONFIRMATION_BODY).contains(
          `This action will remove alert suppression from 7 rules. Click Delete to continue.`
        );

        confirmBulkEditAction();

        waitForBulkEditActionToFinish({ updatedCount: rows.length });

        // check if one of the rules has been updated and suppression is removed
        goToRuleDetailsOf(newTermsRule.name);
        cy.get(DEFINITION_DETAILS).within(() => {
          assertDetailsNotExist(SUPPRESS_BY_DETAILS);
          assertDetailsNotExist(SUPPRESS_FOR_DETAILS);
          assertDetailsNotExist(SUPPRESS_MISSING_FIELD);
        });
      });
    });

    it('Overwrites existing alert suppression', () => {
      const skippedCount = 1; // Threshold rule is skipped
      getRulesManagementTableRows().then((rows) => {
        selectAllRules();
        clickSetAlertSuppressionMenuItem();
        confirmBulkEditAction();

        fillAlertSuppressionFields(['agent.name']);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rows.length - skippedCount });

        // check if one of the rules has been updated
        goToRuleDetailsOf(esqlRule.name);
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', 'agent.name');
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Suppress and group alerts for events with missing fields'
          );
        });
      });
    });
  });
});
