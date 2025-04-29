/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const elasticChart = getService('elasticChart');

  describe('lens chart data', () => {
    before(async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      await elasticChart.setNewChartUiDebugFlag(true);

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    const expectedData = [
      { x: '97.220.3.248', y: 19755 },
      { x: '169.228.188.120', y: 18994 },
      { x: '78.83.247.30', y: 17246 },
      { x: '226.82.228.233', y: 15687 },
      { x: '93.28.27.24', y: 15614.33 },
      { x: 'Other', y: 5722.77 },
    ];

    const expectedPieData = [
      { name: '97.220.3.248', value: 19755 },
      { name: '169.228.188.120', value: 18994 },
      { name: '78.83.247.30', value: 17246 },
      { name: '226.82.228.233', value: 15687 },
      { name: '93.28.27.24', value: 15614.33 },
      { name: '__other__', value: 5722.77 },
    ];

    function assertMatchesExpectedData(state: DebugState | undefined) {
      expect(
        state?.bars![0].bars.map((bar) => ({
          x: bar.x,
          y: Math.floor(bar.y * 100) / 100,
        }))
      ).to.eql(expectedData);
    }

    function assertMatchesExpectedPieData(state: DebugState | undefined) {
      expect(
        state
          ?.partition![0].partitions.map((partition) => ({
            name: partition.name,
            value: Math.floor(partition.value * 100) / 100,
          }))
          .sort(({ value: a }, { value: b }) => b - a)
      ).to.eql(expectedPieData);
    }

    it('should render xy chart', async () => {
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      assertMatchesExpectedData(data);
    });

    it('should render pie chart', async () => {
      await lens.switchToVisualization('pie');
      const data = await lens.getCurrentChartDebugState('partitionVisChart');
      assertMatchesExpectedPieData(data);
    });

    it('should render donut chart', async () => {
      await lens.setDonutHoleSize('Large');
      const data = await lens.getCurrentChartDebugState('partitionVisChart');
      assertMatchesExpectedPieData(data);
    });

    it('should render treemap chart', async () => {
      await lens.switchToVisualization('treemap', 'treemap');
      const data = await lens.getCurrentChartDebugState('partitionVisChart');
      assertMatchesExpectedPieData(data);
    });

    it('should render heatmap chart', async () => {
      await lens.switchToVisualization('heatmap', 'heat');
      const debugState = await lens.getCurrentChartDebugState('heatmapChart');

      // assert axes
      expect(debugState?.axes!.x[0].labels).to.eql([
        '97.220.3.248',
        '169.228.188.120',
        '78.83.247.30',
        '226.82.228.233',
        '93.28.27.24',
        'Other',
      ]);
      expect(debugState?.axes!.y[0].labels).to.eql(['']);

      // assert cells
      expect(debugState?.heatmap!.cells.length).to.eql(6);

      // assert legend
      expect(debugState?.legend!.items).to.eql([
        { key: '5,722.775 - 8,529.22', name: '5,722.775 - 8,529.22', color: '#61a2ff' },
        { key: '8,529.22 - 11,335.665', name: '8,529.22 - 11,335.665', color: '#a8caff' },
        { key: '11,335.665 - 14,142.11', name: '11,335.665 - 14,142.11', color: '#e8f1ff' },
        { key: '14,142.11 - 16,948.555', name: '14,142.11 - 16,948.555', color: '#ffafa6' },
        { key: '≥ 16,948.555', name: '≥ 16,948.555', color: '#f6726a' },
      ]);
    });

    it('should render datatable', async () => {
      await lens.switchToVisualization('lnsDatatable');
      await lens.waitForVisualization();
      const terms = await Promise.all(
        range(0, 6).map((index) => lens.getDatatableCellText(index, 0))
      );
      const values = await Promise.all(
        range(0, 6).map((index) => lens.getDatatableCellText(index, 1))
      );
      expect(terms).to.eql(expectedData.map(({ x }) => x));
      expect(values.map((value) => Math.floor(100 * Number(value.replace(',', ''))) / 100)).to.eql(
        expectedData.map(({ y }) => y)
      );
    });

    it('should render metric', async () => {
      await lens.switchToVisualization('lnsLegacyMetric');
      await lens.waitForVisualization('legacyMtrVis');
      await lens.assertLegacyMetric('Average of bytes', '5,727.322');
    });
  });
}
