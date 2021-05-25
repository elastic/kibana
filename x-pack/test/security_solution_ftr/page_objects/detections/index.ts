/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../functional/ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

export function DetectionsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const { common } = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  class DetectionsPage {
    async navigateHome(): Promise<void> {
      await this.navigateToDetectionsPage();
    }

    async navigateToRules(): Promise<void> {
      await this.navigateToDetectionsPage('rules');
    }

    async navigateToRuleMonitoring(): Promise<void> {
      await common.clickAndValidate('allRulesTableTab-monitoring', 'monitoring-table');
    }

    async navigateToExceptionList(): Promise<void> {
      await common.clickAndValidate('allRulesTableTab-exceptions', 'exceptions-table');
    }

    async navigateToCreateRule(): Promise<void> {
      await this.navigateToDetectionsPage('rules/create');
    }

    async replaceIndexPattern(): Promise<void> {
      const buttons = await find.allByCssSelector('[data-test-subj="comboBoxInput"] button');
      await buttons.map(async (button: WebElementWrapper) => await button.click());
      await testSubjects.setValue('comboBoxSearchInput', '*');
    }

    async openImportQueryModal(): Promise<void> {
      const element = await testSubjects.find('importQueryFromSavedTimeline');
      await element.click(500);
      await testSubjects.exists('open-timeline-modal-body-filter-default');
    }

    async viewTemplatesInImportQueryModal(): Promise<void> {
      await common.clickAndValidate('open-timeline-modal-body-filter-template', 'timelines-table');
    }

    async closeImportQueryModal(): Promise<void> {
      await find.clickByCssSelector('.euiButtonIcon.euiButtonIcon--text.euiModal__closeIcon');
    }

    async selectMachineLearningJob(): Promise<void> {
      await find.clickByCssSelector('[data-test-subj="mlJobSelect"] button');
      await find.clickByCssSelector('#high_distinct_count_error_message');
    }

    async openAddFilterPopover(): Promise<void> {
      const addButtons = await testSubjects.findAll('addFilter');
      await addButtons[1].click();
      await testSubjects.exists('saveFilter');
    }

    async closeAddFilterPopover(): Promise<void> {
      await testSubjects.click('cancelSaveFilter');
    }

    async toggleFilterActions(): Promise<void> {
      const filterActions = await testSubjects.findAll('addFilter');
      await filterActions[1].click();
    }

    async toggleSavedQueries(): Promise<void> {
      const filterActions = await find.allByCssSelector(
        '[data-test-subj="saved-query-management-popover-button"]'
      );
      await filterActions[1].click();
    }

    async addNameAndDescription(
      name: string = 'test rule name',
      description: string = 'test rule description'
    ): Promise<void> {
      await find.setValue(`[aria-describedby="detectionEngineStepAboutRuleName"]`, name, 500);
      await find.setValue(
        `[aria-describedby="detectionEngineStepAboutRuleDescription"]`,
        description,
        500
      );
    }

    async goBackToAllRules(): Promise<void> {
      await common.clickAndValidate('ruleDetailsBackToAllRules', 'create-new-rule');
    }

    async revealAdvancedSettings(): Promise<void> {
      await common.clickAndValidate(
        'advancedSettings',
        'detectionEngineStepAboutRuleReferenceUrls'
      );
    }

    async preview(): Promise<void> {
      await common.clickAndValidate(
        'queryPreviewButton',
        'queryPreviewCustomHistogram',
        undefined,
        500
      );
    }

    async continue(prefix: string): Promise<void> {
      await testSubjects.click(`${prefix}-continue`);
    }

    async addCustomQuery(query: string): Promise<void> {
      await testSubjects.setValue('queryInput', query, undefined, 500);
    }

    async selectMLRule(): Promise<void> {
      await common.clickAndValidate('machineLearningRuleType', 'mlJobSelect');
    }

    async selectEQLRule(): Promise<void> {
      await common.clickAndValidate('eqlRuleType', 'eqlQueryBarTextInput');
    }

    async selectIndicatorMatchRule(): Promise<void> {
      await common.clickAndValidate('threatMatchRuleType', 'comboBoxInput');
    }

    async selectThresholdRule(): Promise<void> {
      await common.clickAndValidate('thresholdRuleType', 'input');
    }

    private async navigateToDetectionsPage(path: string = ''): Promise<void> {
      const subUrl = `detections${path ? `/${path}` : ''}`;
      await common.navigateToUrl('securitySolution', subUrl, {
        shouldUseHashForSubUrl: false,
      });
    }
  }

  return new DetectionsPage();
}
