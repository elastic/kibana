/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { FtrProviderContext } from '../ftr_provider_context';
import { logWrapper } from './log_wrapper';

export function LensPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const elasticChart = getService('elasticChart');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const browser = getService('browser');
  const dashboardAddPanel = getService('dashboardAddPanel');

  const PageObjects = getPageObjects([
    'common',
    'header',
    'timePicker',
    'common',
    'visualize',
    'dashboard',
    'timeToVisualize',
  ]);

  return logWrapper('lensPage', log, {
    /**
     * Clicks the index pattern filters toggle.
     */
    async toggleIndexPatternFiltersPopover() {
      await testSubjects.click('lnsIndexPatternFiltersToggle');
    },

    async findAllFields() {
      const fields = await testSubjects.findAll('lnsFieldListPanelField');
      return await Promise.all(fields.map((field) => field.getVisibleText()));
    },

    async isLensPageOrFail() {
      return await testSubjects.existOrFail('lnsApp', { timeout: 1000 });
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
      return retry.try(async () => {
        await testSubjects.click(`visListingTitleLink-${title}`);
        await this.isLensPageOrFail();
      });
    },

    /**
     * Changes the specified dimension to the specified operation and (optinally) field.
     *
     * @param opts.dimension - the selector of the dimension being changed
     * @param opts.operation - the desired operation ID for the dimension
     * @param opts.field - the desired field for the dimension
     * @param layerIndex - the index of the layer
     */
    async configureDimension(
      opts: {
        dimension: string;
        operation: string;
        field?: string;
        isPreviousIncompatible?: boolean;
        keepOpen?: boolean;
        palette?: string;
        formula?: string;
      },
      layerIndex = 0
    ) {
      await retry.try(async () => {
        await testSubjects.click(`lns-layerPanel-${layerIndex} > ${opts.dimension}`);
        await testSubjects.exists(`lns-indexPatternDimension-${opts.operation}`);
      });

      if (opts.operation === 'formula') {
        await this.switchToFormula();
      } else {
        const operationSelector = opts.isPreviousIncompatible
          ? `lns-indexPatternDimension-${opts.operation} incompatible`
          : `lns-indexPatternDimension-${opts.operation}`;
        async function getAriaPressed() {
          const operationSelectorContainer = await testSubjects.find(operationSelector);
          await testSubjects.click(operationSelector);
          const ariaPressed = await operationSelectorContainer.getAttribute('aria-pressed');
          return ariaPressed;
        }

        // adding retry here as it seems that there is a flakiness of the operation click
        // it seems that the aria-pressed attribute is updated to true when the button is clicked
        await retry.waitFor('aria pressed to be true', async () => {
          const ariaPressedStatus = await getAriaPressed();
          return ariaPressedStatus === 'true';
        });
      }
      if (opts.field) {
        const target = await testSubjects.find('indexPattern-dimension-field');
        await comboBox.openOptionsList(target);
        await comboBox.setElement(target, opts.field);
      }

      if (opts.formula) {
        // Formula takes time to open
        await PageObjects.common.sleep(500);
        await this.typeFormula(opts.formula);
      }

      if (opts.palette) {
        await this.setPalette(opts.palette);
      }

      if (!opts.keepOpen) {
        await this.closeDimensionEditor();
      }
    },

    /**
     * Changes the specified dimension to the specified operation and (optinally) field.
     *
     * @param opts.dimension - the selector of the dimension being changed
     * @param opts.operation - the desired operation ID for the dimension
     * @param opts.field - the desired field for the dimension
     * @param layerIndex - the index of the layer
     */
    async configureReference(opts: {
      operation?: string;
      field?: string;
      isPreviousIncompatible?: boolean;
    }) {
      if (opts.operation) {
        const target = await testSubjects.find('indexPattern-subFunction-selection-row');
        await comboBox.openOptionsList(target);
        await comboBox.setElement(target, opts.operation);
      }

      if (opts.field) {
        const target = await testSubjects.find('indexPattern-reference-field-selection-row');
        await comboBox.openOptionsList(target);
        await comboBox.setElement(target, opts.field);
      }
    },

    /**
     * Drags field to workspace
     *
     * @param field  - the desired field for the dimension
     * */
    async dragFieldToWorkspace(field: string) {
      const from = `lnsFieldListPanelField-${field}`;
      await find.existsByCssSelector(from);
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector('lnsWorkspace')
      );
      await this.waitForLensDragDropToFinish();
      await this.waitForVisualization();
    },

    /**
     * Drags field to geo field workspace
     *
     * @param field  - the desired geo_point or geo_shape field
     * */
    async dragFieldToGeoFieldWorkspace(field: string) {
      const from = `lnsFieldListPanelField-${field}`;
      await find.existsByCssSelector(from);
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector('lnsGeoFieldWorkspace')
      );
      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Drags field to workspace
     *
     * @param field  - the desired field for the dimension
     * */
    async clickField(field: string) {
      await testSubjects.click(`lnsFieldListPanelField-${field}`);
    },

    async editField() {
      await retry.try(async () => {
        await testSubjects.click('lnsFieldListPanelEdit');
        await testSubjects.missingOrFail('lnsFieldListPanelEdit');
      });
    },

    async removeField() {
      await retry.try(async () => {
        await testSubjects.click('lnsFieldListPanelRemove');
        await testSubjects.missingOrFail('lnsFieldListPanelRemove');
      });
    },

    async searchField(name: string) {
      await testSubjects.setValue('lnsIndexPatternFieldSearch', name, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
    },

    async waitForField(field: string) {
      await testSubjects.existOrFail(`lnsFieldListPanelField-${field}`);
    },

    async waitForMissingDataViewWarning() {
      await retry.try(async () => {
        await testSubjects.existOrFail(`missing-refs-failure`);
      });
    },

    async waitForMissingDataViewWarningDisappear() {
      await retry.try(async () => {
        await testSubjects.missingOrFail(`missing-refs-failure`);
      });
    },

    async waitForEmptyWorkspace() {
      await retry.try(async () => {
        await testSubjects.existOrFail(`empty-workspace`);
      });
    },

    async waitForWorkspaceWithVisualization() {
      await retry.try(async () => {
        await testSubjects.existOrFail(`lnsVisualizationContainer`);
      });
    },

    async waitForFieldMissing(field: string) {
      await retry.try(async () => {
        await testSubjects.missingOrFail(`lnsFieldListPanelField-${field}`);
      });
    },

    async pressMetaKey(metaKey: 'shift' | 'alt' | 'ctrl') {
      const metaToAction = {
        shift: 'duplicate',
        alt: 'swap',
        ctrl: 'combine',
      };
      const waitTime = 1000;
      log.debug(`Wait ${waitTime}ms for the extra dop options to show up`);
      await setTimeoutAsync(waitTime);
      const browserKey =
        metaKey === 'shift'
          ? browser.keys.SHIFT
          : metaKey === 'alt'
          ? browser.keys.ALT
          : browser.keys.COMMAND;
      log.debug(`Press ${metaKey} with keyboard`);
      await retry.try(async () => {
        await browser.pressKeys(browserKey);
        await find.existsByCssSelector(
          `.lnsDragDrop__extraDrop > [data-test-subj="lnsDragDrop-${metaToAction[metaKey]}"].lnsDragDrop-isActiveDropTarget`
        );
      });
    },

    /**
     * Copies field to chosen destination that is defined by distance of `steps`
     * (right arrow presses) from it
     *
     * @param fieldName  - the desired field for the dimension
     * @param steps - number of steps user has to press right
     * @param reverse - defines the direction of going through drops
     * */
    async dragFieldWithKeyboard(
      fieldName: string,
      steps = 1,
      reverse = false,
      metaKey?: 'shift' | 'alt' | 'ctrl'
    ) {
      const field = await find.byCssSelector(
        `[data-test-subj="lnsDragDrop_draggable-${fieldName}"] [data-test-subj="lnsDragDrop-keyboardHandler"]`
      );
      await field.focus();
      await retry.try(async () => {
        await browser.pressKeys(browser.keys.ENTER);
        await testSubjects.exists('.lnsDragDrop-isDropTarget'); // checks if we're in dnd mode and there's any drop target active
      });
      for (let i = 0; i < steps; i++) {
        await browser.pressKeys(reverse ? browser.keys.LEFT : browser.keys.RIGHT);
      }
      if (metaKey) {
        this.pressMetaKey(metaKey);
      }
      await browser.pressKeys(browser.keys.ENTER);
      await this.waitForLensDragDropToFinish();

      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Selects draggable element and moves it by number of `steps`
     *
     * @param group  - the group of the element
     * @param index  - the index of the element in the group
     * @param steps - number of steps of presses right or left
     * @param reverse - defines the direction of going through drops
     * */
    async dimensionKeyboardDragDrop(
      group: string,
      index = 0,
      steps = 1,
      reverse = false,
      metaKey?: 'shift' | 'alt' | 'ctrl'
    ) {
      const elements = await find.allByCssSelector(
        `[data-test-subj="${group}"]  [data-test-subj="lnsDragDrop-keyboardHandler"]`
      );
      const el = elements[index];
      await el.focus();
      await browser.pressKeys(browser.keys.ENTER);
      for (let i = 0; i < steps; i++) {
        await browser.pressKeys(reverse ? browser.keys.LEFT : browser.keys.RIGHT);
      }
      if (metaKey) {
        this.pressMetaKey(metaKey);
      }
      await browser.pressKeys(browser.keys.ENTER);

      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },
    /**
     * Selects draggable element and reorders it by number of `steps`
     *
     * @param group  - the group of the element
     * @param index  - the index of the element in the group
     * @param steps - number of steps of presses right or left
     * @param reverse - defines the direction of going through drops
     * */
    async dimensionKeyboardReorder(group: string, index = 0, steps = 1, reverse = false) {
      const elements = await find.allByCssSelector(
        `[data-test-subj="${group}"]  [data-test-subj="lnsDragDrop-keyboardHandler"]`
      );
      const el = elements[index];
      await el.focus();
      await browser.pressKeys(browser.keys.ENTER);
      for (let i = 0; i < steps; i++) {
        await browser.pressKeys(reverse ? browser.keys.ARROW_UP : browser.keys.ARROW_DOWN);
      }
      await browser.pressKeys(browser.keys.ENTER);

      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async waitForLensDragDropToFinish() {
      await retry.try(async () => {
        const exists = await find.existsByCssSelector('.lnsDragDrop-isActiveGroup');
        if (exists) {
          throw new Error('UI still in drag/drop mode');
        }
      });
    },

    /**
     * Drags field to dimension trigger
     *
     * @param field  - the desired field for the dimension
     * @param dimension - the selector of the dimension being changed
     * */
    async dragFieldToDimensionTrigger(field: string, dimension: string) {
      const from = `lnsFieldListPanelField-${field}`;
      await find.existsByCssSelector(from);
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector(dimension)
      );
      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Drags from a dimension to another dimension trigger
     *
     * @param from - the selector of the dimension being moved
     * @param to - the selector of the dimension being dropped to
     * */
    async dragDimensionToDimension(from: string, to: string) {
      await find.existsByCssSelector(from);
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector(to)
      );
      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Reorder elements within the group
     *
     * @param startIndex - the index of dragging element starting from 1
     * @param endIndex - the index of drop starting from 1
     * */
    async reorderDimensions(dimension: string, startIndex: number, endIndex: number) {
      const dragging = `[data-test-subj='${dimension}']:nth-of-type(${startIndex}) .lnsDragDrop`;
      const dropping = `[data-test-subj='${dimension}']:nth-of-type(${endIndex}) [data-test-subj='lnsDragDrop-reorderableDropLayer'`;
      await find.existsByCssSelector(dragging);
      await browser.html5DragAndDrop(dragging, dropping);
      await this.waitForLensDragDropToFinish();
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async assertPalette(palette: string) {
      await retry.try(async () => {
        await testSubjects.click('lns-palettePicker');
        const currentPalette = await (
          await find.byCssSelector('[role=option][aria-selected=true]')
        ).getAttribute('id');
        expect(currentPalette).to.equal(palette);
      });
    },

    async toggleToolbarPopover(buttonTestSub: string) {
      await testSubjects.click(buttonTestSub);
    },

    /**
     * Open the specified dimension.
     *
     * @param dimension - the selector of the dimension panel to open
     * @param layerIndex - the index of the layer
     */
    async openDimensionEditor(dimension: string, layerIndex = 0) {
      await retry.try(async () => {
        await testSubjects.click(`lns-layerPanel-${layerIndex} > ${dimension}`);
      });
    },

    async isDimensionEditorOpen() {
      return await testSubjects.exists('lns-indexPattern-dimensionContainerBack');
    },

    // closes the dimension editor flyout
    async closeDimensionEditor() {
      await retry.try(async () => {
        await testSubjects.click('lns-indexPattern-dimensionContainerBack');
        await testSubjects.missingOrFail('lns-indexPattern-dimensionContainerBack');
      });
    },

    async enableTimeShift() {
      await testSubjects.click('indexPattern-advanced-popover');
      await retry.try(async () => {
        await testSubjects.click('indexPattern-time-shift-enable');
      });
    },

    async setTimeShift(shift: string) {
      await comboBox.setCustom('indexPattern-dimension-time-shift', shift);
    },

    async enableFilter() {
      await testSubjects.click('indexPattern-advanced-popover');
      await retry.try(async () => {
        await testSubjects.click('indexPattern-filter-by-enable');
      });
    },

    async setFilterBy(queryString: string) {
      this.typeFilter(queryString);
      await retry.try(async () => {
        await testSubjects.click('indexPattern-filters-existingFilterTrigger');
      });
    },

    async typeFilter(queryString: string) {
      const queryInput = await testSubjects.find('indexPattern-filters-queryStringInput');
      await queryInput.type(queryString);
    },

    async hasFixAction() {
      return await testSubjects.exists('errorFixAction');
    },

    async useFixAction() {
      await testSubjects.click('errorFixAction');
      await this.waitForVisualization();
    },

    async isTopLevelAggregation() {
      return await testSubjects.isEuiSwitchChecked('indexPattern-nesting-switch');
    },
    /**
     * Removes the dimension matching a specific test subject
     */
    async removeDimension(dimensionTestSubj: string) {
      await testSubjects.click(`${dimensionTestSubj} > indexPattern-dimension-remove`);
    },
    /**
     * adds new filter to filters agg
     */
    async addFilterToAgg(queryString: string) {
      await testSubjects.click('lns-newBucket-add');
      this.typeFilter(queryString);
      // Problem here is that after typing in the queryInput a dropdown will fetch the server
      // with suggestions and show up. Depending on the cursor position and some other factors
      // pressing Enter at this point may lead to auto-complete the queryInput with random stuff from the
      // dropdown which was not intended originally.
      // To close the Filter popover we need to move to the label input and then press Enter:
      // solution is to press Tab 2 twice (first Tab will close the dropdown) instead of Enter to avoid
      // race condition with the dropdown
      await PageObjects.common.pressTabKey();
      await PageObjects.common.pressTabKey();
      // Now it is safe to press Enter as we're in the label input
      await PageObjects.common.pressEnterKey();
      await PageObjects.common.sleep(1000); // give time for debounced components to rerender
    },

    /**
     * Add new term to Top values/terms agg
     * @param opts field to add
     */
    async addTermToAgg(field: string) {
      const lastIndex = (
        await find.allByCssSelector('[data-test-subj^="indexPattern-dimension-field"]')
      ).length;
      await retry.try(async () => {
        await testSubjects.click('indexPattern-terms-add-field');
        // count the number of defined terms
        const target = await testSubjects.find(`indexPattern-dimension-field-${lastIndex}`, 1000);
        await comboBox.openOptionsList(target);
        await comboBox.setElement(target, field);
      });
    },

    async checkTermsAreNotAvailableToAgg(fields: string[]) {
      const lastIndex = (
        await find.allByCssSelector('[data-test-subj^="indexPattern-dimension-field"]')
      ).length;
      await testSubjects.click('indexPattern-terms-add-field');
      // count the number of defined terms
      const target = await testSubjects.find(`indexPattern-dimension-field-${lastIndex}`);
      // await comboBox.openOptionsList(target);
      for (const field of fields) {
        await comboBox.setCustom(`indexPattern-dimension-field-${lastIndex}`, field);
        await comboBox.openOptionsList(target);
        await testSubjects.missingOrFail(`lns-fieldOption-${field}`);
      }
    },

    /**
     * Save the current Lens visualization.
     */
    async save(
      title: string,
      saveAsNew?: boolean,
      redirectToOrigin?: boolean,
      saveToLibrary?: boolean,
      addToDashboard?: 'new' | 'existing' | null,
      dashboardId?: string
    ) {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('lnsApp_saveButton');

      await PageObjects.timeToVisualize.setSaveModalValues(title, {
        saveAsNew,
        redirectToOrigin,
        addToDashboard: addToDashboard ? addToDashboard : null,
        dashboardId,
        saveToLibrary,
      });

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

    async expectSaveAndReturnButtonDisabled() {
      const button = await testSubjects.find('lnsApp_saveAndReturnButton', 10000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async editDimensionLabel(label: string) {
      await testSubjects.setValue('indexPattern-label-edit', label, { clearWithKeyboard: true });
    },
    async editDimensionFormat(format: string) {
      const formatInput = await testSubjects.find('indexPattern-dimension-format');
      await comboBox.openOptionsList(formatInput);
      await comboBox.setElement(formatInput, format);
    },
    async editDimensionColor(color: string) {
      const colorPickerInput = await testSubjects.find('~indexPattern-dimension-colorPicker');
      await colorPickerInput.type(color);
      await PageObjects.common.sleep(1000); // give time for debounced components to rerender
    },
    hasVisualOptionsButton() {
      return testSubjects.exists('lnsVisualOptionsButton');
    },
    async openVisualOptions() {
      await retry.try(async () => {
        await testSubjects.click('lnsVisualOptionsButton');
        await testSubjects.exists('lnsVisualOptionsButton');
      });
    },
    async retrySetValue(
      input: string,
      value: string,
      options = {
        clearWithKeyboard: true,
        typeCharByChar: true,
      } as Record<string, boolean>
    ) {
      await retry.try(async () => {
        await testSubjects.setValue(input, value, options);
        expect(await (await testSubjects.find(input)).getAttribute('value')).to.eql(value);
      });
    },
    async useCurvedLines() {
      await testSubjects.click('lnsCurveStyleToggle');
    },
    async editMissingValues(option: string) {
      await testSubjects.click('lnsMissingValuesSelect');
      const optionSelector = await find.byCssSelector(`#${option}`);
      await optionSelector.click();
    },

    getTitle() {
      return testSubjects.getAttribute('lns_ChartTitle', 'innerText');
    },

    async getFiltersAggLabels() {
      const labels = [];
      const filters = await testSubjects.findAll('indexPattern-filters-existingFilterContainer');
      for (let i = 0; i < filters.length; i++) {
        labels.push(await filters[i].getVisibleText());
      }
      log.debug(`Found ${labels.length} filters on current page`);
      return labels;
    },

    /**
     * Uses the Lens visualization switcher to switch visualizations.
     *
     * @param subVisualizationId - the ID of the sub-visualization to switch to, such as
     * lnsDatatable or bar_stacked
     */
    async switchToVisualization(subVisualizationId: string, searchTerm?: string) {
      await this.openChartSwitchPopover();
      await this.searchOnChartSwitch(subVisualizationId, searchTerm);
      await testSubjects.click(`lnsChartSwitchPopover_${subVisualizationId}`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async openChartSwitchPopover() {
      if (await testSubjects.exists('lnsChartSwitchList')) {
        return;
      }
      await retry.try(async () => {
        await testSubjects.click('lnsChartSwitchPopover');
        await testSubjects.existOrFail('lnsChartSwitchList');
      });
    },

    async changeAxisSide(newSide: string) {
      await testSubjects.click(`lnsXY_axisSide_groups_${newSide}`);
    },

    /** Counts the visible warnings in the config panel */
    async getErrorCount() {
      const moreButton = await testSubjects.exists('configuration-failure-more-errors');
      if (moreButton) {
        await retry.try(async () => {
          await testSubjects.click('configuration-failure-more-errors');
          await testSubjects.missingOrFail('configuration-failure-more-errors');
        });
      }
      const errors = await testSubjects.findAll('configuration-failure-error');
      const expressionErrors = await testSubjects.findAll('expression-failure');
      return (errors?.length ?? 0) + (expressionErrors?.length ?? 0);
    },

    async searchOnChartSwitch(subVisualizationId: string, searchTerm?: string) {
      // Because the new chart switcher is now a virtualized list, the process needs some help
      // So either pass a search string or pick the last 3 letters from the id (3 because pie
      // is the smallest chart name) and use them to search
      const queryTerm = searchTerm ?? subVisualizationId.substring(subVisualizationId.length - 3);
      return await testSubjects.setValue('lnsChartSwitchSearch', queryTerm, {
        clearWithKeyboard: true,
      });
    },

    /**
     * Checks a specific subvisualization in the chart switcher for a "data loss" indicator
     *
     * @param subVisualizationId - the ID of the sub-visualization to switch to, such as
     * lnsDatatable or bar_stacked
     */
    async hasChartSwitchWarning(subVisualizationId: string, searchTerm?: string) {
      await this.openChartSwitchPopover();
      await this.searchOnChartSwitch(subVisualizationId, searchTerm);
      const element = await testSubjects.find(`lnsChartSwitchPopover_${subVisualizationId}`);
      return await testSubjects.descendantExists(
        `lnsChartSwitchPopoverAlert_${subVisualizationId}`,
        element
      );
    },

    /**
     * Uses the Lens layer switcher to switch seriesType for xy charts.
     *
     * @param subVisualizationId - the ID of the sub-visualization to switch to, such as
     * line,
     */
    async switchLayerSeriesType(seriesType: string) {
      await retry.try(async () => {
        await testSubjects.click('lns_layer_settings');
        await testSubjects.exists(`lnsXY_seriesType-${seriesType}`);
      });

      return await testSubjects.click(`lnsXY_seriesType-${seriesType}`);
    },

    /**
     * Returns the number of layers visible in the chart configuration
     */
    async getLayerCount() {
      const elements = await testSubjects.findAll('lnsLayerRemove');
      return elements.length;
    },

    /**
     * Adds a new layer to the chart, fails if the chart does not support new layers
     */
    async createLayer(layerType: string = 'data') {
      await testSubjects.click('lnsLayerAddButton');
      const layerCount = (await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`))
        .length;

      await retry.waitFor('check for layer type support', async () => {
        const fasterChecks = await Promise.all([
          (await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length > layerCount,
          testSubjects.exists(`lnsLayerAddButton-${layerType}`),
        ]);
        return fasterChecks.filter(Boolean).length > 0;
      });
      if (await testSubjects.exists(`lnsLayerAddButton-${layerType}`)) {
        await testSubjects.click(`lnsLayerAddButton-${layerType}`);
      }
    },

    /**
     * Changes the index pattern in the data panel
     */
    async switchDataPanelIndexPattern(name: string) {
      await testSubjects.click('indexPattern-switch-link');
      await find.clickByCssSelector(`[title="${name}"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Changes the index pattern for the first layer
     */
    async switchFirstLayerIndexPattern(name: string) {
      await testSubjects.click('lns_layerIndexPatternLabel');
      await find.clickByCssSelector(`.lnsChangeIndexPatternPopover [title="${name}"]`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Returns the current index pattern of the data panel
     */
    async getDataPanelIndexPattern() {
      return await (await testSubjects.find('indexPattern-switch-link')).getAttribute('title');
    },

    /**
     * Returns the current index pattern of the first layer
     */
    async getFirstLayerIndexPattern() {
      return await (await testSubjects.find('lns_layerIndexPatternLabel')).getAttribute('title');
    },

    async linkedToOriginatingApp() {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('lnsApp_saveAndReturnButton');
    },

    async notLinkedToOriginatingApp() {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('lnsApp_saveAndReturnButton');
    },

    /**
     * Gets label of dimension trigger in dimension panel
     *
     * @param dimension - the selector of the dimension
     * @param index - the index of the dimension trigger in group
     */
    async getDimensionTriggerText(dimension: string, index = 0) {
      const dimensionTexts = await this.getDimensionTriggersTexts(dimension);
      return dimensionTexts[index];
    },
    /**
     * Gets label of all dimension triggers in dimension group
     *
     * @param dimension - the selector of the dimension
     */
    async getDimensionTriggersTexts(dimension: string) {
      return retry.try(async () => {
        const dimensionElements = await testSubjects.findAll(`${dimension} > lns-dimensionTrigger`);
        const dimensionTexts = await Promise.all(
          await dimensionElements.map(async (el) => await el.getVisibleText())
        );
        return dimensionTexts;
      });
    },

    async isShowingNoResults() {
      return (
        (await (await testSubjects.find('lnsWorkspace')).getVisibleText()) === 'No results found'
      );
    },

    async getCurrentChartDebugState() {
      return await elasticChart.getChartDebugData('lnsWorkspace');
    },

    /**
     * Gets text of the specified datatable header cell
     *
     * @param index - index of th element in datatable
     */
    async getDatatableHeaderText(index = 0) {
      const el = await this.getDatatableHeader(index);
      return el.getVisibleText();
    },

    /**
     * Gets text of the specified datatable cell
     *
     * @param rowIndex - index of row of the cell
     * @param colIndex - index of column of the cell
     */
    async getDatatableCellText(rowIndex = 0, colIndex = 0) {
      const el = await this.getDatatableCell(rowIndex, colIndex);
      return el.getVisibleText();
    },

    async getDatatableCellStyle(rowIndex = 0, colIndex = 0) {
      const el = await this.getDatatableCell(rowIndex, colIndex);
      const styleString = await el.getAttribute('style');
      return styleString.split(';').reduce<Record<string, string>>((memo, cssLine) => {
        const [prop, value] = cssLine.split(':');
        if (prop && value) {
          memo[prop.trim()] = value.trim();
        }
        return memo;
      }, {});
    },

    async getCountOfDatatableColumns() {
      const table = await find.byCssSelector('.euiDataGrid');
      const $ = await table.parseDomContent();
      return (await $('.euiDataGridHeaderCell__content')).length;
    },

    async getDatatableHeader(index = 0) {
      log.debug(`All headers ${await testSubjects.getVisibleText('dataGridHeader')}`);
      return find.byCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridHeader"] [role=columnheader]:nth-child(${
          index + 1
        })`
      );
    },

    async getDatatableCell(rowIndex = 0, colIndex = 0) {
      return await find.byCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridRowCell"][data-gridcell-column-index="${colIndex}"][data-gridcell-row-index="${rowIndex}"]`
      );
    },

    async isDatatableHeaderSorted(index = 0) {
      return find.existsByCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridHeader"] [role=columnheader]:nth-child(${
          index + 1
        }) [data-test-subj^="dataGridHeaderCellSortingIcon"]`
      );
    },

    async changeTableSortingBy(colIndex = 0, direction: 'none' | 'ascending' | 'descending') {
      const el = await this.getDatatableHeader(colIndex);
      await el.click();
      let buttonEl;
      if (direction !== 'none') {
        buttonEl = await find.byCssSelector(
          `[data-test-subj^="dataGridHeaderCellActionGroup"] [title="Sort ${direction}"]`
        );
      } else {
        buttonEl = await find.byCssSelector(
          `[data-test-subj^="dataGridHeaderCellActionGroup"] li[class$="selected"] [title^="Sort"]`
        );
      }
      return buttonEl.click();
    },

    async setTableSummaryRowFunction(
      summaryFunction: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max'
    ) {
      await testSubjects.click('lnsDatatable_summaryrow_function');
      await testSubjects.click('lns-datatable-summary-' + summaryFunction);
    },

    async setTableSummaryRowLabel(newLabel: string) {
      await testSubjects.setValue('lnsDatatable_summaryrow_label', newLabel, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
    },

    async setTableDynamicColoring(coloringType: 'none' | 'cell' | 'text') {
      await testSubjects.click('lnsDatatable_dynamicColoring_groups_' + coloringType);
    },

    async openPalettePanel(chartType: string) {
      await retry.try(async () => {
        await testSubjects.click(`${chartType}_dynamicColoring_trigger`);
        // wait for the UI to settle
        await PageObjects.common.sleep(100);
        await testSubjects.existOrFail('lns-indexPattern-PalettePanelContainer', { timeout: 2500 });
      });
    },

    async closePalettePanel() {
      await testSubjects.click('lns-indexPattern-PalettePanelContainerBack');
    },

    // different picker from the next one
    async changePaletteTo(paletteName: string) {
      await testSubjects.click(`lnsPalettePanel_dynamicColoring_palette_picker`);
      await testSubjects.click(`${paletteName}-palette`);
    },

    async setPalette(paletteName: string) {
      await testSubjects.click('lns-palettePicker');
      await find.clickByCssSelector(`#${paletteName}`);
    },

    async closePaletteEditor() {
      await retry.try(async () => {
        await testSubjects.click('lns-indexPattern-PalettePanelContainerBack');
        await testSubjects.missingOrFail('lns-indexPattern-PalettePanelContainerBack');
      });
    },

    async openColorStopPopup(index = 0) {
      const stopEls = await testSubjects.findAll('euiColorStopThumb');
      if (stopEls[index]) {
        await stopEls[index].click();
      }
    },

    async setColorStopValue(value: number | string) {
      await testSubjects.setValue(
        'lnsPalettePanel_dynamicColoring_progression_custom_stops_value',
        String(value)
      );
    },

    async toggleColumnVisibility(dimension: string, no = 1) {
      await this.openDimensionEditor(dimension);
      const id = 'lns-table-column-hidden';
      await PageObjects.common.sleep(500);
      const isChecked = await testSubjects.isEuiSwitchChecked(id);
      log.debug(`switch status before the toggle = ${isChecked}`);
      await testSubjects.setEuiSwitch(id, isChecked ? 'uncheck' : 'check');
      await PageObjects.common.sleep(500);
      const isChecked2 = await testSubjects.isEuiSwitchChecked(id);
      log.debug(`switch status after the toggle = ${isChecked2}`);
      await this.closeDimensionEditor();
      await PageObjects.common.sleep(500);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async clickTableCellAction(rowIndex = 0, colIndex = 0, actionTestSub: string) {
      const el = await this.getDatatableCell(rowIndex, colIndex);
      await el.focus();
      const action = await el.findByTestSubject(actionTestSub);
      return action.click();
    },

    /**
     * Asserts that metric has expected title and count
     *
     * @param title - expected title
     * @param count - expected count of metric
     */
    async assertMetric(title: string, count: string) {
      await this.assertExactText('[data-test-subj="lns_metric_title"]', title);
      await this.assertExactText('[data-test-subj="lns_metric_value"]', count);
    },

    async setMetricDynamicColoring(coloringType: 'none' | 'labels' | 'background') {
      await testSubjects.click('lnsMetric_dynamicColoring_groups_' + coloringType);
    },

    async getMetricStyle() {
      const el = await testSubjects.find('lnsVisualizationContainer');
      const styleString = await el.getAttribute('style');
      return styleString.split(';').reduce<Record<string, string>>((memo, cssLine) => {
        const [prop, value] = cssLine.split(':');
        if (prop && value) {
          memo[prop.trim()] = value.trim();
        }
        return memo;
      }, {});
    },

    async assertMissingValues(option: string) {
      await this.assertExactText('[data-test-subj="lnsMissingValuesSelect"]', option);
    },
    async assertColor(color: string) {
      // TODO: target dimensionTrigger color element after merging https://github.com/elastic/kibana/pull/76871
      await testSubjects.getAttribute('~indexPattern-dimension-colorPicker', color);
    },

    /**
     * Creates and saves a lens visualization from a dashboard
     *
     * @param title - title for the new lens. If left undefined, the panel will be created by value
     * @param redirectToOrigin - whether to redirect back to the dashboard after saving the panel
     */
    async createAndAddLensFromDashboard({
      title,
      redirectToOrigin,
    }: {
      title?: string;
      redirectToOrigin?: boolean;
    }) {
      log.debug(`createAndAddLens${title}`);
      const inViewMode = await PageObjects.dashboard.getIsInViewMode();
      if (inViewMode) {
        await PageObjects.dashboard.switchToEditMode();
      }
      await dashboardAddPanel.clickCreateNewLink();
      await this.goToTimeRange();
      await this.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await this.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await this.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });
      if (title) {
        await this.save(title, false, redirectToOrigin);
      } else {
        await this.saveAndReturn();
      }
    },

    /**
     * Asserts that the focused element is a field with a specified text
     *
     * @param name - the element visible text
     */
    async assertFocusedField(name: string) {
      const input = await find.activeElement();
      const fieldAncestor = await input.findByXpath('./../../..');
      const focusedElementText = await fieldAncestor.getVisibleText();
      const dataTestSubj = await fieldAncestor.getAttribute('data-test-subj');
      expect(focusedElementText).to.eql(name);
      expect(dataTestSubj).to.eql('lnsFieldListPanelField');
    },

    /**
     * Asserts that the focused element is a dimension with with a specified text
     *
     * @param name - the element visible text
     */
    async assertFocusedDimension(name: string) {
      const input = await find.activeElement();
      const fieldAncestor = await input.findByXpath('./../../..');
      const focusedElementText = await fieldAncestor.getVisibleText();
      expect(focusedElementText).to.eql(name);
    },

    async waitForVisualization() {
      async function getRenderingCount() {
        const visualizationContainer = await testSubjects.find('lnsVisualizationContainer');
        const renderingCount = await visualizationContainer.getAttribute('data-rendering-count');
        return Number(renderingCount);
      }
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitFor('rendering count to stabilize', async () => {
        const firstCount = await getRenderingCount();

        await PageObjects.common.sleep(1000);

        const secondCount = await getRenderingCount();

        return firstCount === secondCount;
      });
    },

    async clickAddField() {
      await testSubjects.click('lnsIndexPatternActions');
      await testSubjects.existOrFail('indexPattern-add-field');
      await testSubjects.click('indexPattern-add-field');
    },

    /** resets visualization/layer or removes a layer */
    async removeLayer() {
      await testSubjects.click('lnsLayerRemove');
    },

    /**
     * Starts dragging @param dragging, drags over @param draggedOver and drops it into @dropTarget
     */
    async dragEnterDrop(dragging: string, draggedOver: string, dropTarget: string) {
      await browser.execute(
        `
          function createEvent(typeOfEvent) {
            const event = document.createEvent("CustomEvent");
            event.initCustomEvent(typeOfEvent, true, true, null);
            event.dataTransfer = {
                data: {},
                setData: function(key, value) {
                    this.data[key] = value;
                },
                getData: function(key) {
                    return this.data[key];
                }
            };
            return event;
          }
          function dispatchEvent(element, event, transferData) {
            if (transferData !== undefined) {
                event.dataTransfer = transferData;
            }
            if (element.dispatchEvent) {
                element.dispatchEvent(event);
            } else if (element.fireEvent) {
                element.fireEvent("on" + event.type, event);
            }
          }

          const origin = document.querySelector(arguments[0]);
          const dragStartEvent = createEvent('dragstart');
          dispatchEvent(origin, dragStartEvent);

          setTimeout(() => {
            const target = document.querySelector(arguments[1]);
            const dragenter = createEvent('dragenter');
            const dragover = createEvent('dragover');
            dispatchEvent(target, dragenter, dragStartEvent.dataTransfer);
            dispatchEvent(target, dragover, dragStartEvent.dataTransfer);
            setTimeout(() => {
              const target = document.querySelector(arguments[2]);
              const dropEvent = createEvent('drop');
              dispatchEvent(target, dropEvent, dragStartEvent.dataTransfer);
              const dragEndEvent = createEvent('dragend');
              dispatchEvent(origin, dragEndEvent, dropEvent.dataTransfer);
            }, 100)
          }, 100);
      `,
        dragging,
        draggedOver,
        dropTarget
      );
      await setTimeoutAsync(150);
    },

    /**
     * Drags from a dimension to another dimension trigger to extra drop type
     *
     * @param from - the selector of the dimension being moved
     * @param to - the selector of the main drop type of dimension being dropped to
     * @param type - extra drop type
     * */
    async dragFieldToExtraDropType(
      field: string,
      to: string,
      type: 'duplicate' | 'swap' | 'combine'
    ) {
      const from = `lnsFieldListPanelField-${field}`;
      await this.dragEnterDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector(`${to} > lnsDragDrop`),
        testSubjects.getCssSelector(`${to} > lnsDragDrop-${type}`)
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Drags from a dimension to another dimension trigger to extra drop type
     *
     * @param from - the selector of the dimension being moved
     * @param to - the selector of the main drop type of dimension being dropped to
     * @param type - extra drop type
     * */
    async dragDimensionToExtraDropType(
      from: string,
      to: string,
      type: 'duplicate' | 'swap' | 'combine'
    ) {
      await this.dragEnterDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector(`${to} > lnsDragDrop`),
        testSubjects.getCssSelector(`${to} > lnsDragDrop-${type}`)
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async switchToQuickFunctions() {
      await testSubjects.click('lens-dimensionTabs-quickFunctions');
    },

    async switchToFormula() {
      await testSubjects.click('lens-dimensionTabs-formula');
    },

    async switchToStaticValue() {
      await testSubjects.click('lens-dimensionTabs-static_value');
    },

    async toggleFullscreen() {
      await testSubjects.click('lnsFormula-fullscreen');
    },

    async goToListingPageViaBreadcrumbs() {
      await retry.try(async () => {
        await testSubjects.click('breadcrumb first');
        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }
        await testSubjects.existOrFail('visualizationLandingPage', { timeout: 3000 });
      });
    },

    async typeFormula(formula: string) {
      await find.byCssSelector('.monaco-editor');
      await find.clickByCssSelectorWhenNotDisabled('.monaco-editor');
      const input = await find.activeElement();
      await input.clearValueWithKeyboard({ charByChar: true });
      await input.type(formula);
      // Debounce time for formula
      await PageObjects.common.sleep(300);
    },

    async expectFormulaText(formula: string) {
      const element = await find.byCssSelector('.monaco-editor');
      expect(await element.getVisibleText()).to.equal(formula);
    },

    async filterLegend(value: string) {
      await testSubjects.click(`legend-${value}`);
      const filterIn = await testSubjects.find(`legend-${value}-filterIn`);
      await filterIn.click();
    },

    hasEmptySizeRatioButtonGroup() {
      return testSubjects.exists('lnsEmptySizeRatioButtonGroup');
    },
  });
}
