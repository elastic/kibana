/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DebugState } from '@elastic/charts';
import expect from '@kbn/expect';
import { range } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const elasticChart = getService('elasticChart');

  describe('lens chart data', () => {
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

      await PageObjects.lens.waitForVisualization();
    });

    const expectedData = [
      { x: '97.220.3.248', y: 19755 },
      { x: '169.228.188.120', y: 18994 },
      { x: '78.83.247.30', y: 17246 },
      { x: '226.82.228.233', y: 15687 },
      { x: '93.28.27.24', y: 15614.33 },
      { x: 'Other', y: 5722.77 },
    ];

    function assertMatchesExpectedData(state: DebugState) {
      expect(
        state.bars![0].bars.map((bar) => ({
          x: bar.x,
          y: Math.floor(bar.y * 100) / 100,
        }))
      ).to.eql(expectedData);
    }

    it('should render xy chart', async () => {
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    // Partition chart tests have to be skipped until
    // https://github.com/elastic/elastic-charts/issues/917 gets fixed
    it.skip('should render pie chart', async () => {
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.waitForVisualization();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it.skip('should render donut chart', async () => {
      await PageObjects.lens.switchToVisualization('donut');
      await PageObjects.lens.waitForVisualization();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it.skip('should render treemap chart', async () => {
      await PageObjects.lens.switchToVisualization('treemap');
      await PageObjects.lens.waitForVisualization();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it('should render datatable', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.lens.waitForVisualization();
      const terms = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 0))
      );
      const values = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 1))
      );
      expect(terms).to.eql(expectedData.map(({ x }) => x));
      expect(values.map((value) => Math.floor(100 * Number(value.replace(',', ''))) / 100)).to.eql(
        expectedData.map(({ y }) => y)
      );
    });

    it('should render metric', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.lens.waitForVisualization();
      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
    });
  });
}
