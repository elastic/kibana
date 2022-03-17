/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('lens heatmap', () => {
    before(async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.waitForVisualization('xyVisChart');
    });

    it('should render heatmap chart with the temperature palette', async () => {
      await PageObjects.lens.switchToVisualization('heatmap', 'heat');
      await PageObjects.lens.waitForVisualization('heatmapChart');
      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert axes
      expect(debugState.axes!.x[0].labels).to.eql([
        '97.220.3.248',
        '169.228.188.120',
        '78.83.247.30',
        '226.82.228.233',
        '93.28.27.24',
        'Other',
      ]);
      expect(debugState.axes!.y[0].labels).to.eql(['']);

      // assert cells
      expect(debugState.heatmap!.cells.length).to.eql(6);

      // assert legend
      expect(debugState.legend!.items).to.eql([
        { key: '5,722.77 - 8,529.22', name: '5,722.77 - 8,529.22', color: '#6092c0' },
        { key: '8,529.22 - 11,335.66', name: '8,529.22 - 11,335.66', color: '#a8bfda' },
        { key: '11,335.66 - 14,142.11', name: '11,335.66 - 14,142.11', color: '#ebeff5' },
        { key: '14,142.11 - 16,948.55', name: '14,142.11 - 16,948.55', color: '#ecb385' },
        { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#e7664c' },
      ]);
    });

    it('should reflect stop colors change on the chart', async () => {
      await PageObjects.lens.openDimensionEditor('lnsHeatmap_cellPanel > lns-dimensionTrigger');
      await PageObjects.lens.openPalettePanel('lnsHeatmap');
      await retry.try(async () => {
        await testSubjects.setValue('lnsPalettePanel_dynamicColoring_range_value_0', '10', {
          clearWithKeyboard: true,
          typeCharByChar: true,
        });
      });
      await PageObjects.lens.waitForVisualization('heatmapChart');

      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert legend has changed
      expect(debugState.legend!.items).to.eql([
        { key: '7,126 - 8,529.22', name: '7,126 - 8,529.22', color: '#6092c0' },
        { key: '8,529.22 - 11,335.66', name: '8,529.22 - 11,335.66', color: '#a8bfda' },
        { key: '11,335.66 - 14,142.11', name: '11,335.66 - 14,142.11', color: '#ebeff5' },
        { key: '14,142.11 - 16,948.55', name: '14,142.11 - 16,948.55', color: '#ecb385' },
        { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#e7664c' },
      ]);
    });

    it('should not change when passing from percentage to number', async () => {
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      await PageObjects.lens.waitForVisualization('heatmapChart');

      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert legend has changed
      expect(debugState.legend!.items).to.eql([
        { key: '7,125.99 - 8,529.2', name: '7,125.99 - 8,529.2', color: '#6092c0' },
        { key: '8,529.2 - 11,335.66', name: '8,529.2 - 11,335.66', color: '#a8bfda' },
        { key: '11,335.66 - 14,142.1', name: '11,335.66 - 14,142.1', color: '#ebeff5' },
        { key: '14,142.1 - 16,948.55', name: '14,142.1 - 16,948.55', color: '#ecb385' },
        {
          color: '#e7664c',
          key: '≥ 16,948.55',
          name: '≥ 16,948.55',
        },
      ]);
    });

    it('should reflect stop changes when in number to the chart', async () => {
      await testSubjects.setValue('lnsPalettePanel_dynamicColoring_range_value_0', '0', {
        clearWithKeyboard: true,
      });
      await PageObjects.lens.waitForVisualization('heatmapChart');

      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert legend has changed
      expect(debugState.legend!.items).to.eql([
        { key: '0 - 8,529.2', name: '0 - 8,529.2', color: '#6092c0' },
        { key: '8,529.2 - 11,335.66', name: '8,529.2 - 11,335.66', color: '#a8bfda' },
        { key: '11,335.66 - 14,142.1', name: '11,335.66 - 14,142.1', color: '#ebeff5' },
        { key: '14,142.1 - 16,948.55', name: '14,142.1 - 16,948.55', color: '#ecb385' },
        { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#e7664c' },
      ]);
    });

    it('should reset stop numbers when changing palette', async () => {
      await PageObjects.lens.changePaletteTo('status');
      await PageObjects.lens.waitForVisualization('heatmapChart');

      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert legend has changed
      expect(debugState.legend!.items).to.eql([
        { key: '5,722.77 - 8,529.22', name: '5,722.77 - 8,529.22', color: '#209280' },
        { key: '8,529.22 - 11,335.66', name: '8,529.22 - 11,335.66', color: '#54b399' },
        { key: '11,335.66 - 14,142.11', name: '11,335.66 - 14,142.11', color: '#d6bf57' },
        { key: '14,142.11 - 16,948.55', name: '14,142.11 - 16,948.55', color: '#e7664c' },
        { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#cc5642' },
      ]);
    });

    it('should not change when passing from number to percent', async () => {
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_percent');
      await PageObjects.lens.waitForVisualization('heatmapChart');

      const debugState = await PageObjects.lens.getCurrentChartDebugState();

      if (!debugState) {
        throw new Error('Debug state is not available');
      }

      // assert legend has not changed
      expect(debugState.legend!.items).to.eql([
        { key: '5,722.77 - 8,529.22', name: '5,722.77 - 8,529.22', color: '#209280' },
        { key: '8,529.22 - 11,335.66', name: '8,529.22 - 11,335.66', color: '#54b399' },
        { key: '11,335.66 - 14,142.11', name: '11,335.66 - 14,142.11', color: '#d6bf57' },
        { key: '14,142.11 - 16,948.55', name: '14,142.11 - 16,948.55', color: '#e7664c' },
        { key: '≥ 16,948.55', name: '≥ 16,948.55', color: '#cc5642' },
      ]);
    });
  });
}
