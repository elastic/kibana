/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export const RULES_BULK_ACTION_BUTTON = 'bulk-action-button';
export const RULES_BULK_ACTION_OPTION_ENABLE = 'bulk-action-option-enable';
export const RULES_BULK_ACTION_OPTION_DISABLE = 'bulk-action-option-disable';
export const RULES_SELECT_ALL_RULES = 'select-all-rules-button';
export const RULES_CLEAR_ALL_RULES_SELECTION = 'clear-rules-selection-button';
export const RULES_ROWS_ENABLE_SWITCH_BUTTON = 'rules-row-enable-switch-button';
export const RULES_DISABLED_FILTER = 'rules-disabled-filter';
export const RULES_ENABLED_FILTER = 'rules-enabled-filter';
export const CIS_SECTION_FILTER = 'options-filter-popover-button-cis-section-multi-select-filter';
export const RULE_NUMBER_FILTER = 'options-filter-popover-button-rule-number-multi-select-filter';
export const RULE_NUMBER_FILTER_SEARCH_FIELD = 'rule-number-search-input';
export const RULES_FLYOUT_SWITCH_BUTTON = 'rule-flyout-switch-button';
export const TAKE_ACTION_BUTTON = 'csp:take_action';

export function RulePagePageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const rulePage = {
    toggleBulkActionButton: async () => {
      const bulkActionButtonToBeClicked = await testSubjects.find(RULES_BULK_ACTION_BUTTON);
      await retry.waitFor('bulk action options to be displayed', async () => {
        await bulkActionButtonToBeClicked.click();
        const bulkActionOptions = await testSubjects.findAll(RULES_BULK_ACTION_OPTION_DISABLE);
        return bulkActionOptions.length > 0;
      });
    },

    clickBulkActionOption: async (optionTestId: string) => {
      const bulkActionOption = await testSubjects.find(optionTestId);
      await bulkActionOption.click();
    },

    isBulkActionOptionDisabled: async (optionTestId: string) => {
      const bulkActionOption = await testSubjects.find(optionTestId);
      return await bulkActionOption.getAttribute('disabled');
    },

    clickSelectAllRules: async () => {
      const selectAllRulesButton = await testSubjects.find(RULES_SELECT_ALL_RULES);
      await selectAllRulesButton.click();
    },

    clickClearAllRulesSelection: async () => {
      const clearAllRulesSelectionButton = await testSubjects.find(RULES_CLEAR_ALL_RULES_SELECTION);
      await clearAllRulesSelectionButton.click();
    },

    clickEnableRulesRowSwitchButton: async (index: number) => {
      const enableRulesRowSwitch = await testSubjects.findAll(RULES_ROWS_ENABLE_SWITCH_BUTTON);
      await enableRulesRowSwitch[index].click();
    },

    clickFilterButton: async (filterType: 'enabled' | 'disabled') => {
      const filterButtonToClick =
        (await filterType) === 'enabled'
          ? await testSubjects.find(RULES_ENABLED_FILTER)
          : await testSubjects.find(RULES_DISABLED_FILTER);
      await filterButtonToClick.click();
    },

    getEnableRulesRowSwitchButton: async () => {
      const enableRulesRowSwitch = await testSubjects.findAll(RULES_ROWS_ENABLE_SWITCH_BUTTON);
      return await enableRulesRowSwitch.length;
    },

    clickFilterPopover: async (filterType: 'section' | 'ruleNumber') => {
      const filterPopoverButton =
        (await filterType) === 'section'
          ? await testSubjects.find(CIS_SECTION_FILTER)
          : await testSubjects.find(RULE_NUMBER_FILTER);

      await filterPopoverButton.click();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    clickFilterPopOverOption: async (value: string) => {
      const chosenValue = await testSubjects.find('options-filter-popover-item-' + value);
      await chosenValue.click();
    },

    filterTextInput: async (selector: string, value: string) => {
      const textField = await testSubjects.find(selector);
      await textField.type(value);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    clickRulesNames: async (index: number) => {
      const rulesNames = await testSubjects.findAll('csp_rules_table_row_item_name');
      await rulesNames[index].click();
    },

    clickFlyoutEnableSwitchButton: async () => {
      const rulesFlyoutEnableSwitchButton = await testSubjects.find(RULES_FLYOUT_SWITCH_BUTTON);
      await rulesFlyoutEnableSwitchButton.click();
    },

    getEnableSwitchButtonState: async () => {
      const rulesFlyoutEnableSwitchButton = await testSubjects.find(RULES_FLYOUT_SWITCH_BUTTON);
      return await rulesFlyoutEnableSwitchButton.getAttribute('aria-checked');
    },

    clickTakeActionButton: async () => {
      const takeActionButton = await testSubjects.find(TAKE_ACTION_BUTTON);
      await takeActionButton.click();
    },

    clickTakeActionButtonOption: async (action: 'enable' | 'disable') => {
      const takeActionOption = await testSubjects.find(
        action + '-benchmark-rule-take-action-button'
      );
      await takeActionOption.click();
    },

    getCountersEmptyState: async () => {
      return await testSubjects.exists('rules-counters-empty-state');
    },

    getPostureScoreCounter: async () => {
      return await testSubjects.find('rules-counters-posture-score-counter');
    },

    clickPostureScoreButton: async () => {
      const postureScoreButton = await testSubjects.find('rules-counters-posture-score-button');
      await postureScoreButton.click();
    },

    getIntegrationsEvaluatedCounter: async () => {
      return await testSubjects.find('rules-counters-integrations-evaluated-counter');
    },

    clickIntegrationsEvaluatedButton: async () => {
      const integrationsEvaluatedButton = await testSubjects.find(
        'rules-counters-integrations-evaluated-button'
      );
      await integrationsEvaluatedButton.click();
    },

    getFailedFindingsCounter: async () => {
      return await testSubjects.find('rules-counters-failed-findings-counter');
    },

    clickFailedFindingsButton: async () => {
      const failedFindingsButton = await testSubjects.find('rules-counters-failed-findings-button');
      await failedFindingsButton.click();
    },

    getDisabledRulesCounter: async () => {
      return await testSubjects.find('rules-counters-disabled-rules-counter');
    },

    clickDisabledRulesButton: async () => {
      const disabledRulesButton = await testSubjects.find('rules-counters-disabled-rules-button');
      await disabledRulesButton.click();
    },

    doesElementExist: async (selector: string) => {
      return await testSubjects.exists(selector);
    },
  };

  const navigateToRulePage = async (benchmarkCisId: string, benchmarkCisVersion: string) => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      `cloud_security_posture/benchmarks/${benchmarkCisId}/${benchmarkCisVersion}/rules`,
      { shouldUseHashForSubUrl: false }
    );
    await PageObjects.header.waitUntilLoadingHasFinished();
  };

  return {
    waitForPluginInitialized,
    navigateToRulePage,
    rulePage,
  };
}
