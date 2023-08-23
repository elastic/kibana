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
import { tag } from '../../../../../tags';

import {
  RULES_BULK_EDIT_ACTIONS_INFO,
  RULES_BULK_EDIT_ACTIONS_WARNING,
  ADD_RULE_ACTIONS_MENU_ITEM,
} from '../../../../../screens/rules_bulk_actions';
import { actionFormSelector } from '../../../../../screens/common/rule_actions';

import { cleanKibana, deleteAlertsAndRules, deleteConnectors } from '../../../../../tasks/common';
import type { RuleActionCustomFrequency } from '../../../../../tasks/common/rule_actions';
import {
  addSlackRuleAction,
  assertSlackRuleAction,
  addEmailConnectorAndRuleAction,
  assertEmailRuleAction,
  assertSelectedCustomFrequencyOption,
  assertSelectedPerRuleRunFrequencyOption,
  assertSelectedSummaryOfAlertsOption,
  pickCustomFrequencyOption,
  pickPerRuleRunFrequencyOption,
  pickSummaryOfAlertsOption,
} from '../../../../../tasks/common/rule_actions';
import {
  waitForRulesTableToBeLoaded,
  selectNumberOfRules,
  goToEditRuleActionsSettingsOf,
  disableAutoRefresh,
} from '../../../../../tasks/alerts_detection_rules';
import {
  waitForBulkEditActionToFinish,
  submitBulkEditForm,
  checkOverwriteRuleActionsCheckbox,
  openBulkEditRuleActionsForm,
  openBulkActionsMenu,
} from '../../../../../tasks/rules_bulk_actions';
import { login, visitWithoutDateRange } from '../../../../../tasks/login';

import { SECURITY_DETECTIONS_RULES_URL } from '../../../../../urls/navigation';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { createSlackConnector } from '../../../../../tasks/api_calls/connectors';

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
  excessivelyInstallAllPrebuiltRules,
  preventPrebuiltRulesPackageInstallation,
} from '../../../../../tasks/api_calls/prebuilt_rules';

const ruleNameToAssert = 'Custom rule name with actions';
const expectedNumberOfCustomRulesToBeEdited = 7;
// 7 custom rules of different types + 2 prebuilt.
// number of selected rules doesn't matter, we only want to make sure they will be edited an no modal window displayed as for other actions
const expectedNumberOfRulesToBeEdited = expectedNumberOfCustomRulesToBeEdited + 2;

const expectedExistingSlackMessage = 'Existing slack action';
const expectedSlackMessage = 'Slack action test message';

describe(
  'Detection rules, bulk edit of rule actions',
  { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] },
  () => {
    beforeEach(() => {
      cleanKibana();
      login();
      deleteAlertsAndRules();
      deleteConnectors();
      cy.task('esArchiverResetKibana');

      createSlackConnector().then(({ body }) => {
        const actions: RuleActionArray = [
          {
            id: body.id,
            action_type_id: '.slack',
            group: 'default',
            params: {
              message: expectedExistingSlackMessage,
            },
            frequency: {
              summary: true,
              throttle: null,
              notifyWhen: 'onActiveAlert',
            },
          },
        ];

        createRule(getNewRule({ name: ruleNameToAssert, rule_id: '1', max_signals: 500, actions }));
      });

      createRule(getEqlRule({ rule_id: '2' }));
      createRule(getMachineLearningRule({ rule_id: '3' }));
      createRule(getNewThreatIndicatorRule({ rule_id: '4' }));
      createRule(getNewThresholdRule({ rule_id: '5' }));
      createRule(getNewTermsRule({ rule_id: '6' }));
      createRule(getNewRule({ saved_id: 'mocked', rule_id: '7' }));

      createSlackConnector();

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

      createAndInstallMockedPrebuiltRules({ rules: [RULE_1, RULE_2] });
    });

    context('Restricted action privileges', () => {
      it("User with no privileges can't add rule actions", () => {
        login(ROLES.hunter_no_actions);
        visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL, ROLES.hunter_no_actions);
        waitForCallOutToBeShown(MISSING_PRIVILEGES_CALLOUT, 'primary');
        waitForRulesTableToBeLoaded();

        selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);

        openBulkActionsMenu();

        cy.get(ADD_RULE_ACTIONS_MENU_ITEM).should('be.disabled');
      });
    });

    context('All actions privileges', () => {
      beforeEach(() => {
        login();
        visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);
        waitForRulesTableToBeLoaded();
        disableAutoRefresh();
      });

      it('Add a rule action to rules (existing connector)', () => {
        const expectedActionFrequency: RuleActionCustomFrequency = {
          throttle: 1,
          throttleUnit: 'd',
        };

        excessivelyInstallAllPrebuiltRules();

        // select both custom and prebuilt rules
        selectNumberOfRules(expectedNumberOfRulesToBeEdited);
        openBulkEditRuleActionsForm();

        // ensure rule actions info callout displayed on the form
        cy.get(RULES_BULK_EDIT_ACTIONS_INFO).should('be.visible');

        addSlackRuleAction(expectedSlackMessage);
        pickSummaryOfAlertsOption();
        pickCustomFrequencyOption(expectedActionFrequency);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: expectedNumberOfRulesToBeEdited });

        // check if rule has been updated
        goToEditRuleActionsSettingsOf(ruleNameToAssert);

        assertSelectedSummaryOfAlertsOption();
        assertSelectedCustomFrequencyOption(expectedActionFrequency, 1);
        assertSlackRuleAction(expectedExistingSlackMessage, 0);
        assertSlackRuleAction(expectedSlackMessage, 1);
        // ensure there is no third action
        cy.get(actionFormSelector(2)).should('not.exist');
      });

      it('Overwrite rule actions in rules', () => {
        excessivelyInstallAllPrebuiltRules();

        // select both custom and prebuilt rules
        selectNumberOfRules(expectedNumberOfRulesToBeEdited);
        openBulkEditRuleActionsForm();

        addSlackRuleAction(expectedSlackMessage);
        pickSummaryOfAlertsOption();
        pickPerRuleRunFrequencyOption();

        // check overwrite box, ensure warning is displayed
        checkOverwriteRuleActionsCheckbox();
        cy.get(RULES_BULK_EDIT_ACTIONS_WARNING).contains(
          `You're about to overwrite rule actions for ${expectedNumberOfRulesToBeEdited} selected rules`
        );

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: expectedNumberOfRulesToBeEdited });

        // check if rule has been updated
        goToEditRuleActionsSettingsOf(ruleNameToAssert);

        assertSelectedSummaryOfAlertsOption();
        assertSelectedPerRuleRunFrequencyOption();
        assertSlackRuleAction(expectedSlackMessage);
        // ensure existing action was overwritten
        cy.get(actionFormSelector(1)).should('not.exist');
      });

      it('Add a rule action to rules (new connector)', () => {
        const expectedActionFrequency: RuleActionCustomFrequency = {
          throttle: 2,
          throttleUnit: 'h',
        };
        const expectedEmail = 'test@example.com';
        const expectedSubject = 'Subject';

        selectNumberOfRules(expectedNumberOfCustomRulesToBeEdited);
        openBulkEditRuleActionsForm();

        addEmailConnectorAndRuleAction(expectedEmail, expectedSubject);
        pickSummaryOfAlertsOption();
        pickCustomFrequencyOption(expectedActionFrequency);

        submitBulkEditForm();
        waitForBulkEditActionToFinish({ updatedCount: expectedNumberOfCustomRulesToBeEdited });

        // check if rule has been updated
        goToEditRuleActionsSettingsOf(ruleNameToAssert);

        assertSelectedSummaryOfAlertsOption();
        assertSelectedCustomFrequencyOption(expectedActionFrequency, 1);
        assertEmailRuleAction(expectedEmail, expectedSubject);
      });
    });
  }
);
