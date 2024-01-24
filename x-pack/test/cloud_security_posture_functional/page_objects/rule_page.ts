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
      await bulkActionButtonToBeClicked.click();
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
  };

  const navigateToRulePage = async (benchmarkCisId: string, benchmarkCisVersion: string) => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      `cloud_security_posture/benchmarks/${benchmarkCisId}/${benchmarkCisVersion}/rules`,
      { shouldUseHashForSubUrl: false }
    );
  };

  return {
    waitForPluginInitialized,
    navigateToRulePage,
    rulePage,
  };
}
