/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { decode } from '@kbn/rison';

import type { LogRateAnalysisType } from '@kbn/aiops-log-rate-analysis';

import type { FtrProviderContext } from '../../ftr_provider_context';

import type { LogRateAnalysisDataGenerator } from './log_rate_analysis_data_generator';
import { CreateCaseParams } from '../cases/create';

export function LogRateAnalysisPageProvider({ getService, getPageObject }: FtrProviderContext) {
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const ml = getService('ml');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const header = getPageObject('header');
  const dashboardPage = getPageObject('dashboard');
  const cases = getService('cases');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('aiopsTimeRangeSelectorSection');
    },

    async assertUrlState(expectedGlogalState: object, expectedAppState: object) {
      const currentUrl = await browser.getCurrentUrl();
      const parsedUrl = new URL(currentUrl);

      const stateG = decode(parsedUrl.searchParams.get('_g') ?? '');
      const stateA = decode(parsedUrl.searchParams.get('_a') ?? '');

      expect(stateG).to.eql(expectedGlogalState);
      expect(stateA).to.eql(expectedAppState);
    },

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('aiopsTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async assertSamplingProbability(expectedFormattedSamplingProbability: string) {
      await retry.tryForTime(5000, async () => {
        const samplingProbability = await testSubjects.getVisibleText('aiopsSamplingProbability');
        expect(samplingProbability).to.eql(
          expectedFormattedSamplingProbability,
          `Expected total document count to be '${expectedFormattedSamplingProbability}' (got '${samplingProbability}')`
        );
      });
    },

    async setQueryInput(query: string) {
      await retry.tryForTime(30 * 1000, async () => {
        const aiopsQueryInput = await testSubjects.find('aiopsQueryInput');

        await aiopsQueryInput.clearValueWithKeyboard();
        const queryBarEmpty = await aiopsQueryInput.getVisibleText();
        expect(queryBarEmpty).to.eql(
          '',
          `Expected query bar to be emptied, got '${queryBarEmpty}'`
        );

        await aiopsQueryInput.type(query);
        await aiopsQueryInput.pressKeys(browser.keys.ENTER);
        await header.waitUntilLoadingHasFinished();
        const queryBarText = await aiopsQueryInput.getVisibleText();
        expect(queryBarText).to.eql(
          query,
          `Expected query bar text to be '${query}' (got '${queryBarText}')`
        );
      });
    },

    async assertSamplingProbabilityMissing() {
      await testSubjects.missingOrFail('aiopsSamplingProbability');
    },

    async clickUseFullDataButton(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry('mlDatePickerButtonUseFullData');
        await testSubjects.clickWhenNotDisabledWithoutRetry('superDatePickerApplyTimeButton');
        await this.assertTotalDocumentCount(expectedFormattedTotalDocCount);
      });
    },

    async assertTotalDocCountHeaderExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsTotalDocCountHeader`);
      });
    },

    async assertTotalDocCountChartExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsDocumentCountChart`);
      });
    },

    async assertSearchPanelExists() {
      await testSubjects.existOrFail(`aiopsSearchPanel`);
    },

    async assertChangePointDetectedPromptExists() {
      await testSubjects.existOrFail(`aiopsChangePointDetectedPrompt`);
    },

    async assertNoWindowParametersEmptyPromptExists() {
      await testSubjects.existOrFail(`aiopsNoWindowParametersEmptyPrompt`);
    },

    async assertNoResultsFoundEmptyPromptExists() {
      await testSubjects.existOrFail(`aiopsNoResultsFoundEmptyPrompt`);
    },

    async clickDocumentCountChart(chartClickCoordinates: [number, number]) {
      await elasticChart.waitForRenderComplete();
      const el = await elasticChart.getCanvas();

      await browser
        .getActions()
        .move({ x: chartClickCoordinates[0], y: chartClickCoordinates[1], origin: el._webElement })
        .click()
        .perform();

      await this.assertHistogramBrushesExist();
    },

    async clickNoAutoRunButton() {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        'aiopsLogRateAnalysisNoAutoRunContentRunAnalysisButton'
      );

      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.missingOrFail('aiopsLogRateAnalysisNoAutoRunContentRunAnalysisButton');
      });
    },

    async clickRerunAnalysisButton(shouldRerun: boolean) {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        `aiopsRerunAnalysisButton${shouldRerun ? ' shouldRerun' : ''}`
      );

      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(
          `aiopsRerunAnalysisButton${!shouldRerun ? ' shouldRerun' : ''}`
        );
      });
    },

    async assertHistogramBrushesExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsHistogramBrushes`);
        // As part of the interface for the histogram brushes, the button to clear the selection should be present
        await testSubjects.existOrFail(`aiopsClearSelectionBadge`);
      });
    },

    async assertAnalysisSectionExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsLogRateAnalysisResults`);
      });
    },

    async assertLogRateAnalysisResultsGroupSwitchExists(checked: boolean) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(
          `aiopsLogRateAnalysisGroupSwitch${checked ? ' checked' : ''}`
        );
      });
    },

    async clickLogRateAnalysisResultsGroupSwitchOn() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry('aiopsLogRateAnalysisGroupSwitchOn');
        await testSubjects.existOrFail('aiopsLogRateAnalysisGroupSwitch checked');
      });
    },

    async assertFilterPopoverButtonExists(selector: string, isOpen: boolean) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(selector);

        if (isOpen) {
          await testSubjects.existOrFail('aiopsFieldSelectorSearch');
        } else {
          await testSubjects.missingOrFail('aiopsFieldSelectorSearch');
        }
      });
    },

    async clickFilterPopoverButton(selector: string, expectPopoverToBeOpen: boolean) {
      await testSubjects.clickWhenNotDisabledWithoutRetry(selector);

      await retry.tryForTime(30 * 1000, async () => {
        await this.assertFilterPopoverButtonExists(selector, expectPopoverToBeOpen);
      });
    },

    async assertFieldSelectorFieldNameList(expectedFields: string[]) {
      const currentFields = await testSubjects.getVisibleText('aiopsFieldSelectorFieldNameList');
      expect(currentFields).to.be(expectedFields.join('\n'));
    },

    async setFieldSelectorSearch(searchText: string) {
      await ml.commonUI.setValueWithChecks('aiopsFieldSelectorSearch', searchText, {
        clearWithKeyboard: true,
        enforceDataTestSubj: true,
      });
      await this.assertFieldSelectorSearchValue(searchText);
    },

    async clickFieldSelectorDisableAllSelectedButton() {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        'aiopsFieldSelectorDeselectAllFieldsButton'
      );

      await retry.tryForTime(30 * 1000, async () => {
        await retry.tryForTime(5000, async () => {
          await testSubjects.missingOrFail('aiopsFieldSelectorFieldNameListItem checked');
        });
      });
    },

    async assertFieldSelectorSearchValue(expectedValue: string) {
      const actualSearchValue = await testSubjects.getAttribute(
        'aiopsFieldSelectorSearch',
        'value'
      );
      expect(actualSearchValue).to.eql(
        expectedValue,
        `Field selector search input text should be '${expectedValue}' (got '${actualSearchValue}')`
      );
    },

    async assertFieldFilterApplyButtonExists(disabled: boolean) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsFieldFilterApplyButton${disabled ? ' disabled' : ''}`);
      });
    },

    async clickFieldFilterApplyButton(selector: string) {
      await testSubjects.clickWhenNotDisabledWithoutRetry('aiopsFieldFilterApplyButton');

      await retry.tryForTime(30 * 1000, async () => {
        await this.assertFilterPopoverButtonExists(selector, false);
      });
    },

    async clickFieldSelectorListItem(selector: string) {
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.click(selector);
      });
    },

    async assertRerunAnalysisButtonExists(shouldRerun: boolean) {
      await testSubjects.existOrFail(
        `aiopsRerunAnalysisButton${shouldRerun ? ' shouldRerun' : ''}`
      );
    },

    async clickAutoRunButton() {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        'aiopsLogRateAnalysisContentRunAnalysisButton'
      );

      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.missingOrFail('aiopsLogRateAnalysisContentRunAnalysisButton');
      });
    },

    async assertAutoRunButtonExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('aiopsLogRateAnalysisContentRunAnalysisButton');
      });
    },

    async assertNoAutoRunButtonExists() {
      await testSubjects.existOrFail('aiopsLogRateAnalysisNoAutoRunContentRunAnalysisButton');
    },

    async assertProgressTitle(expectedProgressTitle: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('aiopProgressTitle');
        const currentProgressTitle = await testSubjects.getVisibleText('aiopProgressTitle');
        expect(currentProgressTitle).to.be(expectedProgressTitle);
      });
    },

    async assertAnalysisComplete(
      analysisType: LogRateAnalysisType,
      dataGenerator: LogRateAnalysisDataGenerator,
      noResults = false
    ) {
      const dataGeneratorParts = dataGenerator.split('_');
      const zeroDocsFallback = dataGeneratorParts.includes('zerodocsfallback');
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail('aiopsAnalysisComplete');
        const currentProgressTitle = await testSubjects.getVisibleText('aiopsAnalysisComplete');
        expect(currentProgressTitle).to.be('Analysis complete');

        if (noResults) {
          await testSubjects.existOrFail('aiopsNoResultsFoundEmptyPrompt');
          return;
        }

        await testSubjects.existOrFail('aiopsLogRateAnalysisInfoPopoverButton');
        const currentAnalysisTypePopoverButtonLabel = await testSubjects.getVisibleText(
          'aiopsLogRateAnalysisInfoPopoverButton'
        );

        if (zeroDocsFallback && analysisType === 'spike') {
          expect(currentAnalysisTypePopoverButtonLabel).to.be('Top items for deviation time range');
        } else if (zeroDocsFallback && analysisType === 'dip') {
          expect(currentAnalysisTypePopoverButtonLabel).to.be('Top items for baseline time range');
        } else {
          expect(currentAnalysisTypePopoverButtonLabel).to.be(`Log rate ${analysisType}`);
        }
      });
    },

    async navigateToDataViewSelection() {
      await testSubjects.click('mlMainTab logRateAnalysis');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async getBrushSelectionWidth(selector: string) {
      const brush = await testSubjects.find(selector);
      const brushSelection = (await brush.findAllByClassName('selection'))[0];
      const brushSelectionRect = await brushSelection._webElement.getRect();
      return brushSelectionRect.width;
    },

    async getPxForTimestamp(timestamp: number) {
      await elasticChart.waitForRenderComplete('aiopsDocumentCountChart');
      const chartDebugData = await elasticChart.getChartDebugData('aiopsDocumentCountChart');

      // Select the wrapper element to access its 'width' later one for the calculations.
      const dualBrushWrapper = await testSubjects.find('aiopsDualBrush');
      const dualBrushWrapperRect = await dualBrushWrapper._webElement.getRect();

      // Get the total count of bars and index of a bar for a given timestamp in the charts debug data.
      const bars = chartDebugData?.bars?.[0].bars ?? [];
      const barsCount = bars.length;

      const closestTimestamp = bars
        .map((d) => d.x)
        .reduce(function (p, c) {
          return Math.abs(c - timestamp) < Math.abs(p - timestamp) ? c : p;
        });

      const targetDeviationBarIndex = bars.findIndex((b) => b.x === closestTimestamp);

      // The pixel location based on the given timestamp, calculated by taking the share of the index value
      // over the total count of bars, normalized by the wrapping element's width.
      const targetPx = Math.round(
        (targetDeviationBarIndex / barsCount) * dualBrushWrapperRect.width
      );

      // The pixel width of the interval of an individual bar of the histogram.
      // Can be used as a helper to calculate the offset from the target pixel location
      // to the next histogram bar.
      const intervalPx = Math.round((1 / barsCount) * dualBrushWrapperRect.width);

      return { targetPx, intervalPx };
    },

    async adjustBrushHandler(selector: string, handlerClassName: string, targetPx: number) {
      const brush = await testSubjects.find(selector);
      const dualBrushWrapper = await testSubjects.find('aiopsDualBrush');
      const dualBrushWrapperRect = await dualBrushWrapper._webElement.getRect();

      const handle = (await brush.findAllByClassName(handlerClassName))[0];
      const handleRect = await handle._webElement.getRect();
      const handlePx = handleRect.x - dualBrushWrapperRect.x;
      const dragAndDropOffsetPx = targetPx - handlePx;

      await browser.dragAndDrop(
        { location: handle, offset: { x: 0, y: 0 } },
        { location: handle, offset: { x: dragAndDropOffsetPx, y: 0 } }
      );
    },

    async openAttachmentsMenu() {
      await testSubjects.click('aiopsLogRateAnalysisAttachmentsMenuButton');
    },

    async clickAttachToDashboard() {
      await testSubjects.click('aiopsLogRateAnalysisAttachToDashboardButton');
    },

    async confirmAttachToDashboard() {
      await testSubjects.click('aiopsLogRateAnalysisAttachToDashboardSubmitButton');
    },

    async completeSaveToDashboardForm(createNew?: boolean) {
      const dashboardSelector = await testSubjects.find('add-to-dashboard-options');
      if (createNew) {
        const label = await dashboardSelector.findByCssSelector(
          `label[for="new-dashboard-option"]`
        );
        await label.click();
      }

      await testSubjects.click('confirmSaveSavedObjectButton');
      await retry.waitForWithTimeout('Save modal to disappear', 1000, () =>
        testSubjects
          .missingOrFail('confirmSaveSavedObjectButton')
          .then(() => true)
          .catch(() => false)
      );

      // make sure the dashboard page actually loaded
      const dashboardItemCount = await dashboardPage.getSharedItemsCount();
      expect(dashboardItemCount).to.not.eql(undefined);

      const embeddable = await testSubjects.find('aiopsEmbeddableLogRateAnalysis', 30 * 1000);
      expect(await embeddable.isDisplayed()).to.eql(
        true,
        'Log rate analysis chart should be displayed in dashboard'
      );
    },

    async attachToDashboard() {
      await this.openAttachmentsMenu();
      await this.clickAttachToDashboard();
      await this.confirmAttachToDashboard();
      await this.completeSaveToDashboardForm(true);
    },

    async assertAttachToCaseButtonDisabled() {
      const button = await testSubjects.find('aiopsLogRateAnalysisAttachToCaseButton');
      const isEnabled = await button.isEnabled();
      expect(isEnabled).to.be(false);
    },

    async clickAttachToCase() {
      await testSubjects.click('aiopsLogRateAnalysisAttachToCaseButton');
    },

    async attachToCase(params: CreateCaseParams) {
      await this.openAttachmentsMenu();
      await this.clickAttachToCase();

      await cases.create.createCaseFromModal(params);
    },
  };
}
