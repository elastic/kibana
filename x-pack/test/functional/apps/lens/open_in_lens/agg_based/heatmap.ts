/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, lens, visChart, timePicker, visEditor } = getPageObjects([
    'visualize',
    'lens',
    'visChart',
    'timePicker',
    'visEditor',
  ]);

  describe('Heatmap', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickHeatmapChart();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Edit Visualization in Lens" menu item if no X-axis was specified', async () => {
      await visChart.waitForVisualizationRenderingStabilized();

      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      await visEditor.clickBucket('X-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();

      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await visEditor.clickBucket('X-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('heatmapChart');
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert axes
      expect(debugState.axes!.x[0].labels).to.eql(['win 8', 'win xp', 'win 7', 'ios', 'osx']);
      expect(debugState.axes!.y[0].labels).to.eql(['']);
      expect(debugState.heatmap!.cells.length).to.eql(5);
      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '0 - 25',
          name: '0 - 25',
        },
        { color: '#86CB66', key: '25 - 50', name: '25 - 50' },
        {
          color: '#FEFEBD',
          key: '50 - 75',
          name: '50 - 75',
        },
        {
          color: '#F88D52',
          key: '75 - 100',
          name: '75 - 100',
        },
      ]);
    });

    it('should convert to Lens if Y-axis is defined, but X-axis is not', async () => {
      await visEditor.clickBucket('Y-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('heatmapChart');
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      expect(debugState.axes!.x[0].labels).to.eql(['*']);
      expect(debugState.axes!.y[0].labels).to.eql(['win 8', 'win xp', 'win 7', 'ios', 'osx']);
      expect(debugState.heatmap!.cells.length).to.eql(5);
    });

    it('should respect heatmap colors number', async () => {
      await visEditor.clickBucket('X-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();

      await visEditor.clickOptionsTab();
      await visEditor.changeHeatmapColorNumbers(6);
      await visEditor.clickGo();
      await visChart.waitForVisualizationRenderingStabilized();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('heatmapChart');
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '0 - 16.67',
          name: '0 - 16.67',
        },
        {
          color: '#4CB15D',
          key: '16.67 - 33.33',
          name: '16.67 - 33.33',
        },
        {
          color: '#B7E075',
          key: '33.33 - 50',
          name: '33.33 - 50',
        },
        {
          color: '#FEFEBD',
          key: '50 - 66.67',
          name: '50 - 66.67',
        },
        {
          color: '#FDBF6F',
          key: '66.67 - 83.33',
          name: '66.67 - 83.33',
        },
        {
          color: '#EA5839',
          key: '83.33 - 100',
          name: '83.33 - 100',
        },
      ]);
    });

    it('should show respect heatmap custom color ranges', async () => {
      await visEditor.clickBucket('X-axis');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();

      await visEditor.clickOptionsTab();
      await visEditor.clickOptionsTab();
      await visEditor.clickEnableCustomRanges();
      await visEditor.clickAddRange();
      await visEditor.clickAddRange();
      await visEditor.clickAddRange();
      await visEditor.clickAddRange();
      await visEditor.clickAddRange();

      await visEditor.clickGo();
      await visChart.waitForVisualizationRenderingStabilized();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('heatmapChart');
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      expect(debugState.legend!.items).to.eql([
        {
          color: '#006837',
          key: '0 - 100',
          name: '0 - 100',
        },
        {
          color: '#65BC62',
          key: '100 - 200',
          name: '100 - 200',
        },
        {
          color: '#D8EF8C',
          key: '200 - 300',
          name: '200 - 300',
        },
        {
          color: '#FEDF8B',
          key: '300 - 400',
          name: '300 - 400',
        },
        {
          color: '#F36D43',
          key: '400 - 500',
          name: '400 - 500',
        },
        {
          color: '#A50026',
          key: '500 - 600',
          name: '500 - 600',
        },
      ]);
    });
  });
}
