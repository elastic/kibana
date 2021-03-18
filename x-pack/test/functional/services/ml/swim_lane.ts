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

type HeatmapDebugState = Required<Pick<DebugState, 'heatmap' | 'axes' | 'legend'>>;

export function SwimLaneProvider({ getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  /**
   * Y axis labels width + padding
   */
  const xOffset = 185;

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
        `Expected swim lane  to be ${
          expectedData ? `${expectedData.x.join(',')} and ${expectedData.y.join(',')}` : 'null'
        }, got ${
          actualSelection.data
            ? `${actualSelection.data.x.join(',')} and ${actualSelection.data.y.join(',')}`
            : 'null'
        }`
      );
    },

    /**
     * Selects a single cell
     * @param testSubj
     * @param x - number of pixels from the Y-axis
     * @param y - number of pixels from the top of the canvas element
     */
    async selectSingleCell(testSubj: string, { x, y }: { x: number; y: number }) {
      const renderCount = await elasticChart.getVisualizationRenderingCount();
      const el = await elasticChart.getCanvas(testSubj);

      const { width, height } = await el.getSize();

      const canvasCenter = { x: Math.round(width / 2), y: Math.round(height / 2) };

      /**
       * Origin of the element uses the center point, hence we need ot adjust
       * the click coordinated accordingly.
       */
      const resultX = xOffset + Math.round(x) - canvasCenter.x;
      const resultY = Math.round(y) - canvasCenter.y;

      await browser
        .getActions()
        .move({ x: resultX, y: resultY, origin: el._webElement })
        .click()
        .perform();

      if (testSubj === 'mlAnomalyExplorerSwimlaneViewBy') {
        // We have a glitchy behaviour when clicking on the View By swim lane.
        // The entire charts is re-rendered, hence it requires a different check
        // await testSubjects.waitForHidden(testSubj);
        // await testSubjects.waitForHidden('mlSwimLaneLoadingIndicator');
        await testSubjects.existOrFail(testSubj);
        await elasticChart.waitForRenderComplete(testSubj);
      } else {
        await elasticChart.waitForRenderingCount(renderCount + 1, testSubj);
      }
    },

    async assertSwimlaneSelection() {},
  };
}
