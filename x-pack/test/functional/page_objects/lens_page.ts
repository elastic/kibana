/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
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
  const PageObjects = getPageObjects(['header', 'timePicker', 'common', 'visualize']);

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
      },
      layerIndex = 0
    ) {
      await retry.try(async () => {
        await testSubjects.click(`lns-layerPanel-${layerIndex} > ${opts.dimension}`);
        await testSubjects.exists(`lns-indexPatternDimension-${opts.operation}`);
      });
      const operationSelector = opts.isPreviousIncompatible
        ? `lns-indexPatternDimension-${opts.operation} incompatible`
        : `lns-indexPatternDimension-${opts.operation}`;
      await testSubjects.click(operationSelector);

      if (opts.field) {
        const target = await testSubjects.find('indexPattern-dimension-field');
        await comboBox.openOptionsList(target);
        await comboBox.setElement(target, opts.field);
      }

      if (opts.palette) {
        await testSubjects.click('lns-palettePicker');
        await find.clickByCssSelector(`#${opts.palette}`);
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
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(`lnsFieldListPanelField-${field}`),
        testSubjects.getCssSelector('lnsWorkspace')
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Drags field to dimension trigger
     *
     * @param field  - the desired field for the dimension
     * @param dimension - the selector of the dimension being changed
     * */
    async dragFieldToDimensionTrigger(field: string, dimension: string) {
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(`lnsFieldListPanelField-${field}`),
        testSubjects.getCssSelector(dimension)
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Drags field to dimension trigger
     *
     * @param from - the selector of the dimension being moved
     * @param to - the selector of the dimension being dropped to
     * */
    async dragDimensionToDimension(from: string, to: string) {
      await browser.html5DragAndDrop(
        testSubjects.getCssSelector(from),
        testSubjects.getCssSelector(to)
      );
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Reorder elements within the group
     *
     * @param startIndex - the index of dragging element
     * @param endIndex - the index of drop
     * */
    async reorderDimensions(dimension: string, startIndex: number, endIndex: number) {
      const dragging = `[data-test-subj='${dimension}']:nth-of-type(${
        startIndex + 1
      }) .lnsDragDrop`;
      const dropping = `[data-test-subj='${dimension}']:nth-of-type(${
        endIndex + 1
      }) [data-test-subj='lnsDragDrop-reorderableDrop'`;
      await browser.html5DragAndDrop(dragging, dropping);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async assertPalette(palette: string) {
      await retry.try(async () => {
        await testSubjects.click('lns-palettePicker');
        const currentPalette = await (
          await find.byCssSelector('[aria-selected=true]')
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

    // closes the dimension editor flyout
    async closeDimensionEditor() {
      await retry.try(async () => {
        await testSubjects.click('lns-indexPattern-dimensionContainerBack');
        await testSubjects.missingOrFail('lns-indexPattern-dimensionContainerBack');
      });
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
      const queryInput = await testSubjects.find('indexPattern-filters-queryStringInput');
      await queryInput.type(queryString);
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
     * Save the current Lens visualization.
     */
    async save(
      title: string,
      saveAsNew?: boolean,
      redirectToOrigin?: boolean,
      addToDashboard?: boolean,
      dashboardId?: string
    ) {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.click('lnsApp_saveButton');

      await PageObjects.visualize.setSaveModalValues(title, {
        saveAsNew,
        redirectToOrigin,
        addToDashboard,
        dashboardId,
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

    async editDimensionLabel(label: string) {
      await testSubjects.setValue('indexPattern-label-edit', label, { clearWithKeyboard: true });
    },
    async editDimensionFormat(format: string) {
      const formatInput = await testSubjects.find('indexPattern-dimension-format');
      await comboBox.openOptionsList(formatInput);
      await comboBox.setElement(formatInput, format);
    },
    async editDimensionColor(color: string) {
      const colorPickerInput = await testSubjects.find('colorPickerAnchor');
      await colorPickerInput.type(color);
      await PageObjects.common.sleep(1000); // give time for debounced components to rerender
    },
    async editMissingValues(option: string) {
      await retry.try(async () => {
        await testSubjects.click('lnsValuesButton');
        await testSubjects.exists('lnsValuesButton');
      });
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
      return errors?.length ?? 0;
    },

    /**
     * Checks a specific subvisualization in the chart switcher for a "data loss" indicator
     *
     * @param subVisualizationId - the ID of the sub-visualization to switch to, such as
     * lnsDatatable or bar_stacked
     */
    async hasChartSwitchWarning(subVisualizationId: string) {
      await this.openChartSwitchPopover();
      const element = await testSubjects.find(`lnsChartSwitchPopover_${subVisualizationId}`);
      return await find.descendantExistsByCssSelector(
        '.euiKeyPadMenuItem__betaBadgeWrapper',
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
    async createLayer() {
      await testSubjects.click('lnsLayerAddButton');
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
      await find.clickByCssSelector(`[title="${name}"]`);
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

    async getDatatableHeader(index = 0) {
      return find.byCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridHeader"] [role=columnheader]:nth-child(${
          index + 1
        })`
      );
    },

    async getDatatableCell(rowIndex = 0, colIndex = 0) {
      return await find.byCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridRow"]:nth-child(${
          rowIndex + 2 // this is a bit specific for EuiDataGrid: the first row is the Header
        }) [data-test-subj="dataGridRowCell"]:nth-child(${colIndex + 1})`
      );
    },

    async isDatatableHeaderSorted(index = 0) {
      return find.existsByCssSelector(
        `[data-test-subj="lnsDataTable"] [data-test-subj="dataGridHeader"] [role=columnheader]:nth-child(${
          index + 1
        }) [data-test-subj^="dataGridHeaderCellSortingIcon"]`
      );
    },

    async changeTableSortingBy(colIndex = 0, direction: 'none' | 'asc' | 'desc') {
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

    async assertMissingValues(option: string) {
      await this.assertExactText('[data-test-subj="lnsMissingValuesSelect"]', option);
    },
    async assertColor(color: string) {
      // TODO: target dimensionTrigger color element after merging https://github.com/elastic/kibana/pull/76871
      await testSubjects.getAttribute('colorPickerAnchor', color);
    },
  });
}
