/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DebugState } from '@elastic/charts';
import { DebugStateAxis } from '@elastic/charts/dist/state/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

type HeatmapDebugState = Required<Pick<DebugState, 'heatmap' | 'axes' | 'legend'>>;

export function SwimLaneProvider({ getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  /**
   * Y axis labels width + padding
   */
  const xOffset = 170;

  /**
   * Get coordinates relative to the left top corner of the canvas
   * and transpose them from the center point.
   */
  async function getCoordinatesFromCenter(
    el: WebElementWrapper,
    coordinates: { x: number; y: number }
  ) {
    const { width, height } = await el.getSize();

    const elCenter = {
      x: Math.round(width / 2),
      y: Math.round(height / 2),
    };

    /**
     * Origin of the element uses the center point, hence we need ot adjust
     * the click coordinated accordingly.
     */
    const resultX = xOffset + Math.round(coordinates.x) - elCenter.x;
    const resultY = Math.round(coordinates.y) - elCenter.y;

    return {
      x: resultX,
      y: resultY,
    };
  }

  const getRenderTracker = async (testSubj: string) => {
    const renderCount = await elasticChart.getVisualizationRenderingCount(testSubj);

    return {
      async verify() {
        if (testSubj === 'mlAnomalyExplorerSwimlaneViewBy') {
          // We have a glitchy behaviour when clicking on the View By swim lane.
          // The entire charts is re-rendered, hence it requires a different check
          await testSubjects.existOrFail(testSubj);
          await elasticChart.waitForRenderComplete(testSubj);
        } else {
          await elasticChart.waitForRenderingCount(renderCount + 1, testSubj);
        }
      },
    };
  };

  return {
    async getDebugState(testSubj: string): Promise<HeatmapDebugState> {
      const state = await elasticChart.getChartDebugData(testSubj);
      if (!state) {
        throw new Error('Swim lane debug state is not available');
      }
      return state as HeatmapDebugState;
    },

    async getAxisLabels(testSubj: string, axis: 'x' | 'y'): Promise<DebugStateAxis['labels']> {
      const state = await this.getDebugState(testSubj);
      return state.axes[axis][0].labels;
    },

    async assertAxisLabels(testSubj: string, axis: 'x' | 'y', expectedValues: string[]) {
      const actualValues = await this.getAxisLabels(testSubj, axis);
      expect(actualValues).to.eql(
        expectedValues,
        `Expected swim lane ${axis} labels to be ${expectedValues}, got ${actualValues}`
      );
    },

    async assertAxisLabelCount(testSubj: string, axis: 'x' | 'y', expectedCount: number) {
      await retry.tryForTime(5000, async () => {
        const actualValues = await this.getAxisLabels(testSubj, axis);
        expect(actualValues.length).to.eql(
          expectedCount,
          `Expected swim lane ${axis} label count to be ${expectedCount}, got ${actualValues}`
        );
      });
    },

    async getCells(testSubj: string): Promise<HeatmapDebugState['heatmap']['cells']> {
      const state = await this.getDebugState(testSubj);
      return state.heatmap.cells;
    },

    async getHighlighted(testSubj: string): Promise<HeatmapDebugState['heatmap']['selection']> {
      const state = await this.getDebugState(testSubj);
      return state.heatmap.selection;
    },

    async assertSelection(
      testSubj: string,
      expectedData: HeatmapDebugState['heatmap']['selection']['data'],
      expectedArea?: HeatmapDebugState['heatmap']['selection']['area']
    ) {
      const actualSelection = await this.getHighlighted(testSubj);
      expect(actualSelection.data).to.eql(
        expectedData,
        `Expected swim lane to have ${
          expectedData
            ? `selected X-axis values ${expectedData.x.join(
                ','
              )} and Y-axis values ${expectedData.y.join(',')}`
            : 'no data selected'
        }, got ${
          actualSelection.data
            ? `${actualSelection.data.x.join(',')} and ${actualSelection.data.y.join(',')}`
            : 'null'
        }`
      );
      if (expectedArea) {
        expect(actualSelection.area).to.eql(expectedArea);
      }
    },

    /**
     * Selects a single cell
     * @param testSubj
     * @param x - number of pixels from the Y-axis
     * @param y - number of pixels from the top of the canvas element
     */
    async selectSingleCell(testSubj: string, { x, y }: { x: number; y: number }) {
      await testSubjects.existOrFail(testSubj);
      await testSubjects.scrollIntoView(testSubj);
      const renderTracker = await getRenderTracker(testSubj);
      const el = await elasticChart.getCanvas(testSubj);

      const { x: resultX, y: resultY } = await getCoordinatesFromCenter(el, { x, y });

      await browser
        .getActions()
        .move({ x: resultX, y: resultY, origin: el._webElement })
        .click()
        .perform();

      await renderTracker.verify();
    },

    async selectCells(
      testSubj: string,
      coordinates: { x1: number; x2: number; y1: number; y2: number }
    ) {
      await testSubjects.existOrFail(testSubj);
      await testSubjects.scrollIntoView(testSubj);
      const renderTracker = await getRenderTracker(testSubj);

      const el = await elasticChart.getCanvas(testSubj);

      const { x: resultX1, y: resultY1 } = await getCoordinatesFromCenter(el, {
        x: coordinates.x1,
        y: coordinates.y1,
      });
      const { x: resultX2, y: resultY2 } = await getCoordinatesFromCenter(el, {
        x: coordinates.x2,
        y: coordinates.y2,
      });

      await browser.dragAndDrop(
        {
          location: el,
          offset: { x: resultX1, y: resultY1 },
        },
        {
          location: el,
          offset: { x: resultX2, y: resultY2 },
        }
      );

      await renderTracker.verify();
    },

    async assertActivePage(testSubj: string, expectedPage: number) {
      const pagination = await testSubjects.find(`${testSubj} > mlSwimLanePagination`);
      const activePage = await pagination.findByCssSelector(
        '.euiPaginationButton-isActive .euiButtonEmpty__text'
      );
      const text = await activePage.getVisibleText();
      expect(text).to.eql(expectedPage);
    },

    async assertPageSize(testSubj: string, expectedPageSize: number) {
      const actualPageSize = await testSubjects.find(
        `${testSubj} > ${expectedPageSize.toString()}`
      );
      expect(await actualPageSize.isDisplayed()).to.be(true);
    },

    async selectPage(testSubj: string, page: number) {
      await testSubjects.click(`${testSubj} > pagination-button-${page - 1}`);
      await this.assertActivePage(testSubj, page);
    },

    async setPageSize(testSubj: string, rowsCount: 5 | 10 | 20 | 50 | 100) {
      await testSubjects.click(`${testSubj} > mlSwimLanePageSizeControl`);
      await testSubjects.existOrFail('mlSwimLanePageSizePanel');
      await testSubjects.click(`mlSwimLanePageSizePanel > ${rowsCount} rows`);
      await this.assertPageSize(testSubj, rowsCount);
    },

    async waitForSwimLanesToLoad() {
      // when updating the swim lanes, the old lanes might still be displayed
      // for some time, before the loading indicator is displayed

      // wait for loading indicator to be displayed, but don't fail in case it's already gone
      if (await testSubjects.exists('mlSwimLaneLoadingIndicator', { timeout: 10 * 1000 })) {
        // only wait for loading indicator to disappear if it was actually displayed
        await testSubjects.missingOrFail('mlSwimLaneLoadingIndicator', { timeout: 10 * 1000 });
      }
    },
  };
}
