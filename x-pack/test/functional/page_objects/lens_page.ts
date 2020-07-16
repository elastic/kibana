/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { logWrapper } from './log_wrapper';

export function LensPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects([
    'header',
    'common',
    'visualize',
    'dashboard',
    'header',
    'timePicker',
  ]);

  return logWrapper('lensPage', log, {
    /**
     * Clicks the index pattern filters toggle.
     */
    async toggleIndexPatternFiltersPopover() {
      await testSubjects.click('lnsIndexPatternFiltersToggle');
    },

    async findAllFields() {
      return await testSubjects.findAll('lnsFieldListPanelField');
    },

    /**
     * Move the date filter to the specified time range, defaults to
     * a range that has data in our dataset.
     */
    async goToTimeRange(fromTime?: string, toTime?: string) {
      await PageObjects.timePicker.ensureHiddenNoDataPopover();
      fromTime = fromTime || PageObjects.timePicker.defaultStartTime;
      toTime = toTime || PageObjects.timePicker.defaultEndTime;
      await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    },

    /**
     * Wait for the specified element to have text that passes the specified test.
     *
     * @param selector - the element selector
     * @param test - the test function to run on the element's text
     */
    async assertExpectedText(selector: string, test: (value?: string) => boolean) {
      let actualText: string | undefined;

      await retry.waitForWithTimeout('assertExpectedText', 1000, async () => {
        actualText = await find.byCssSelector(selector).then((el) => el.getVisibleText());
        return test(actualText);
      });

      if (!test(actualText)) {
        throw new Error(`"${actualText}" did not match expectation.`);
      }
    },

    /**
     * Asserts that the specified element has the expected inner text.
     *
     * @param selector - the element selector
     * @param expectedText - the expected text
     */
    assertExactText(selector: string, expectedText: string) {
      return this.assertExpectedText(selector, (value) => value === expectedText);
    },

    /**
     * Clicks a visualize list item's title (in the visualize app).
     *
     * @param title - the title of the list item to be clicked
     */
    clickVisualizeListItemTitle(title: string) {
      return testSubjects.click(`visListingTitleLink-${title}`);
    },

    /**
     * Changes the specified dimension to the specified operation and (optinally) field.
     *
     * @param opts.dimension - the selector of the dimension being changed
     * @param opts.operation - the desired operation ID for the dimension
     * @param opts.field - the desired field for the dimension
     */
    async configureDimension(opts: { dimension: string; operation: string; field: string }) {
      await retry.try(async () => {
        await testSubjects.click(opts.dimension);
        await testSubjects.exists(`lns-indexPatternDimension-${opts.operation}`);
      });

      await testSubjects.click(`lns-indexPatternDimension-${opts.operation}`);

      const target = await testSubjects.find('indexPattern-dimension-field');
      await comboBox.openOptionsList(target);
      await comboBox.setElement(target, opts.field);
    },

    /**
     * Removes the dimension matching a specific test subject
     */
    async removeDimension(dimensionTestSubj: string) {
      await testSubjects.click(`${dimensionTestSubj} > indexPattern-dimensionPopover-remove`);
    },

    /**
     * Save the current Lens visualization.
     */
    async save(title: string, saveAsNew?: boolean, redirectToOrigin?: boolean) {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('lnsApp_saveButton');
      await testSubjects.setValue('savedObjectTitle', title);

      const saveAsNewCheckboxExists = await testSubjects.exists('saveAsNewCheckbox');
      if (saveAsNewCheckboxExists) {
        const state = saveAsNew ? 'check' : 'uncheck';
        await testSubjects.setEuiSwitch('saveAsNewCheckbox', state);
      }

      const redirectToOriginCheckboxExists = await testSubjects.exists('returnToOriginModeSwitch');
      if (redirectToOriginCheckboxExists) {
        const state = redirectToOrigin ? 'check' : 'uncheck';
        await testSubjects.setEuiSwitch('returnToOriginModeSwitch', state);
      }

      await testSubjects.click('confirmSaveSavedObjectButton');
      await retry.waitForWithTimeout('Save modal to disappear', 1000, () =>
        testSubjects
          .missingOrFail('confirmSaveSavedObjectButton')
          .then(() => true)
          .catch(() => false)
      );
    },

    async saveAndReturn() {
      await testSubjects.click('lnsApp_saveAndReturnButton');
    },

    getTitle() {
      return testSubjects.getVisibleText('lns_ChartTitle');
    },

    /**
     * Uses the Lens visualization switcher to switch visualizations.
     *
     * @param subVisualizationId - the ID of the sub-visualization to switch to, such as
     * lnsDatatable or bar_stacked
     */
    async switchToVisualization(subVisualizationId: string) {
      await this.openChartSwitchPopover();
      await testSubjects.click(`lnsChartSwitchPopover_${subVisualizationId}`);
    },

    async openChartSwitchPopover() {
      if (await testSubjects.exists('visTypeTitle')) {
        return;
      }
      await retry.try(async () => {
        await testSubjects.click('lnsChartSwitchPopover');
        await testSubjects.existOrFail('visTypeTitle');
      });
    },
  });
}
