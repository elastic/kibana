/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export function ExplainLogRateSpikesPageProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('aiopsTimeRangeSelectorSection');
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
        await testSubjects.existOrFail(`aiopsExplainLogRateSpikesAnalysis`);
      });
    },

    async assertSpikeAnalysisGroupSwitchExists(checked: boolean) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(
          `aiopsExplainLogRateSpikesGroupSwitch${checked ? ' checked' : ''}`
        );
      });
    },

    async clickSpikeAnalysisGroupSwitch(checked: boolean) {
      await testSubjects.clickWhenNotDisabledWithoutRetry(
        `aiopsExplainLogRateSpikesGroupSwitch${checked ? ' checked' : ''}`
      );

      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(
          `aiopsExplainLogRateSpikesGroupSwitch${!checked ? ' checked' : ''}`
        );
      });
    },

    async assertRerunAnalysisButtonExists(shouldRerun: boolean) {
      await testSubjects.existOrFail(
        `aiopsRerunAnalysisButton${shouldRerun ? ' shouldRerun' : ''}`
      );
    },

    async assertProgressTitle(expectedProgressTitle: string) {
      await testSubjects.existOrFail('aiopProgressTitle');
      const currentProgressTitle = await testSubjects.getVisibleText('aiopProgressTitle');
      expect(currentProgressTitle).to.be(expectedProgressTitle);
    },

    async navigateToIndexPatternSelection() {
      await testSubjects.click('mlMainTab explainLogRateSpikes');
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
  };
}
