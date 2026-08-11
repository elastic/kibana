/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleActionArray } from '@kbn/securitysolution-io-ts-alerting-types';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import {
  MISSING_PRIVILEGES_CALLOUT,
  waitForCallOutToBeShown,
} from '../../../../../tasks/common/callouts';
import { createRuleAssetSavedObject } from '../../../../../helpers/rules';

import {
  RULES_BULK_EDIT_ACTIONS_INFO,
  RULES_BULK_EDIT_ACTIONS_WARNING,
  BULK_ACTIONS_BTN,
} from '../../../../../screens/rules_bulk_actions';
import {
  actionFormSelector,
  EMAIL_ACTION_BTN,
  EMAIL_ACTION_SUBJECT_INPUT,
  EMAIL_ACTION_TO_INPUT,
} from '../../../../../screens/common/rule_actions';

import { deleteAlertsAndRules, deleteConnectors } from '../../../../../tasks/api_calls/common';
import type { RuleActionCustomFrequency } from '../../../../../tasks/common/rule_actions';
import {
  addEmailConnectorAndRuleAction,
  fillEmailRuleActionForm,
  assertSelectedCustomFrequencyOption,
  assertSelectedPerRuleRunFrequencyOption,
  assertSelectedSummaryOfAlertsOption,
  pickCustomFrequencyOption,
  pickPerRuleRunFrequencyOption,
  pickSummaryOfAlertsOption,
} from '../../../../../tasks/common/rule_actions';
import {
  goToEditRuleActionsSettingsOf,
  expectManagementTableRules,
  selectAllRules,
  selectRulesByName,
  getRulesManagementTableRows,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';
import {
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  checkOverwriteRuleActionsCheckbox,
  openBulkEditRuleActionsForm,
} from '../../../../../tasks/rules_bulk_actions';
import { login } from '../../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../../tasks/rules_management';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { createEmailConnector } from '../../../../../tasks/api_calls/connectors';

import {
  getEqlRule,
  getNewThreatIndicatorRule,
  getNewRule,
  getNewThresholdRule,
  getMachineLearningRule,
  getNewTermsRule,
} from '../../../../../objects/rule';
import {
  createAndInstallMockedPrebuiltRules,
  installMockPrebuiltRulesPackage,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../../tasks/api_calls/prebuilt_rules';

const ruleNameToAssert = 'Custom rule name with actions';

const expectedExistingEmail = 'existing@example.com';
const expectedExistingSubject = 'Existing email action';
const expectedEmail = 'new@example.com';
const expectedSubject = 'New email action';

const addEmailRuleAction = (email: string, subject: string) => {
  cy.get(EMAIL_ACTION_BTN).click();
  fillEmailRuleActionForm(email, subject);
};

const assertEmailRuleActionAtPosition = (email: string, subject: string, position: number) => {
  cy.get(actionFormSelector(position)).within(() => {
    cy.get(EMAIL_ACTION_TO_INPUT).contains(email);
    cy.get(EMAIL_ACTION_SUBJECT_INPUT).should('have.value', subject);
  });
};

describe(
  'Detection rules, bulk edit of rule actions',
  { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] },
  () => {
    before(() => {
      installMockPrebuiltRulesPackage();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deleteConnectors();

      createEmailConnector().then(({ body }) => {
        const actions: RuleActionArray = [
          {
            id: body.id,
            action_type_id: '.email',
            group: 'default',
            params: {
              to: [expectedExistingEmail],
              subject: expectedExistingSubject,
              message: expectedExistingSubject,
            },
            frequency: {
              summary: true,
              throttle: null,
              notifyWhen: 'onActiveAlert',
            },
          },
        ];

        createRule(
          getNewRule({
            rule_id: '1',
            name: ruleNameToAssert,
            max_signals: 500,
            actions,
            enabled: false,
          })
        );
      });

      createRule(getEqlRule({ rule_id: '2', name: 'New EQL Rule', enabled: false }));
      createRule(
        getMachineLearningRule({ rule_id: '3', name: 'New ML Rule Test', enabled: false })
      );
      createRule(
        getNewThreatIndicatorRule({
          rule_id: '4',
          name: 'Threat Indicator Rule Test',
          enabled: false,
        })
      );
      createRule(getNewThresholdRule({ rule_id: '5', name: 'Threshold Rule', enabled: false }));
      createRule(getNewTermsRule({ rule_id: '6', name: 'New Terms Rule', enabled: false }));
      createRule(
        getNewRule({ saved_id: 'mocked', rule_id: '7', name: 'New Rule Test', enabled: false })
      );

      createEmailConnector();

      // Prevent prebuilt rules package installation and mock two prebuilt rules
      preventPrebuiltRulesPackageInstallation();

      const RULE_1 = createRuleAssetSavedObject({
        name: 'Test rule 1',
        rule_id: 'rule_1',
      });
      const RULE_2 = createRuleAssetSavedObject({
        name: 'Test rule 2',
        rule_id: 'rule_2',
      });

      createAndInstallMockedPrebuiltRules([RULE_1, RULE_2]);
    });

    context('Restricted action privileges', () => {
      it('User with read-only privileges can see bulk actions menu', () => {
        login(ROLES.t1_analyst);
        visitRulesManagementTable();

        expectManagementTableRules([
          ruleNameToAssert,
          'New EQL Rule',
          'New ML Rule Test',
          'Threat Indicator Rule Test',
          'Threshold Rule',
          'New Terms Rule',
          'New Rule Test',
          'Test rule 1',
          'Test rule 2',
        ]);
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');

        cy.get(BULK_ACTIONS_BTN).should('exist');
      });
    });

    context('All actions privileges', () => {
      beforeEach(() => {
        login();
        visitRulesManagementTable();
        disableAutoRefresh();

        expectManagementTableRules([
          ruleNameToAssert,
          'New EQL Rule',
          'New ML Rule Test',
          'Threat Indicator Rule Test',
          'Threshold Rule',
          'New Terms Rule',
          'New Rule Test',
          'Test rule 1',
          'Test rule 2',
        ]);
      });

      it('Add a rule action to rules (existing connector)', () => {
        const expectedActionFrequency: RuleActionCustomFrequency = {
          throttle: 1,
          throttleUnit: 'd',
        };

        getRulesManagementTableRows().then((rows) => {
          // select both custom and prebuilt rules
          selectAllRules();
          openBulkEditRuleActionsForm();

          // ensure rule actions info callout displayed on the form
          cy.get(RULES_BULK_EDIT_ACTIONS_INFO).should('be.visible');

          addEmailRuleAction(expectedEmail, expectedSubject);
          pickSummaryOfAlertsOption();
          pickCustomFrequencyOption(expectedActionFrequency);

          submitBulkEditForm();
          waitForBulkEditActionToFinish({ updatedCount: rows.length });

          // check if rule has been updated
          goToEditRuleActionsSettingsOf(ruleNameToAssert);

          assertSelectedSummaryOfAlertsOption();
          assertSelectedCustomFrequencyOption(expectedActionFrequency, 1);
          assertEmailRuleActionAtPosition(expectedExistingEmail, expectedExistingSubject, 0);
          assertEmailRuleActionAtPosition(expectedEmail, expectedSubject, 1);
          // ensure there is no third action
          cy.get(actionFormSelector(2)).should('not.exist');
        });
      });

      it('Overwrite rule actions in rules', () => {
        getRulesManagementTableRows().then((rows) => {
          // select both custom and prebuilt rules
          selectAllRules();
          openBulkEditRuleActionsForm();

          addEmailRuleAction(expectedEmail, expectedSubject);
          pickSummaryOfAlertsOption();
          pickPerRuleRunFrequencyOption();

          // check overwrite box, ensure warning is displayed
          checkOverwriteRuleActionsCheckbox();
          cy.get(RULES_BULK_EDIT_ACTIONS_WARNING).contains(
            `You're about to overwrite rule actions for ${rows.length} selected rules`
          );

          submitBulkEditForm();
          waitForBulkEditActionToFinish({ updatedCount: rows.length });

          // check if rule has been updated
          goToEditRuleActionsSettingsOf(ruleNameToAssert);

          assertSelectedSummaryOfAlertsOption();
          assertSelectedPerRuleRunFrequencyOption();
          assertEmailRuleActionAtPosition(expectedEmail, expectedSubject, 0);
          // ensure existing action was overwritten
          cy.get(actionFormSelector(1)).should('not.exist');
        });
      });

      it('Add a rule action to rules (new connector)', () => {
        const rulesToSelect = [
          ruleNameToAssert,
          'New EQL Rule',
          'New ML Rule Test',
          'Threat Indicator Rule Test',
          'Threshold Rule',
          'New Terms Rule',
          'New Rule Test',
        ] as const;
        const expectedActionFrequency: RuleActionCustomFrequency = {
          throttle: 2,
          throttleUnit: 'h',
        };
        const expectedNewConnectorEmail = 'test@example.com';
        const expectedNewConnectorSubject = 'Subject';

        selectRulesByName(rulesToSelect);
        openBulkEditRuleActionsForm();

        addEmailConnectorAndRuleAction(expectedNewConnectorEmail, expectedNewConnectorSubject);
        pickSummaryOfAlertsOption();
        pickCustomFrequencyOption(expectedActionFrequency);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: rulesToSelect.length });

        // check if rule has been updated
        goToEditRuleActionsSettingsOf(ruleNameToAssert);

        assertSelectedSummaryOfAlertsOption();
        assertSelectedCustomFrequencyOption(expectedActionFrequency, 1);
        assertEmailRuleActionAtPosition(expectedNewConnectorEmail, expectedNewConnectorSubject, 1);
      });
    });
  }
);
