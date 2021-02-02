/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        operation: 'avg',
        field: 'bytes',
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    const expectedData = [
      { x: '0.53.251.53', y: 4624.75 },
      { x: '0.108.3.2', y: 7359.41 },
      { x: '0.209.80.244', y: 6169.9 },
      { x: '0.228.1.71', y: 7092.8 },
      { x: '0.254.91.215', y: 3835.58 },
      { x: '__other__', y: 5727.24 },
    ];

    function assertMatchesExpectedData(state: DebugState) {
      expect(
        state.bars![0].bars.map((bar) => ({
          x: bar.x,
          y: Math.round(bar.y * 100) / 100,
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
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it.skip('should render donut chart', async () => {
      await PageObjects.lens.switchToVisualization('donut');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it.skip('should render treemap chart', async () => {
      await PageObjects.lens.switchToVisualization('treemap');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.lens.getCurrentChartDebugState();
      assertMatchesExpectedData(data!);
    });

    it('should render datatable', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const terms = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 0))
      );
      const values = await Promise.all(
        range(0, 6).map((index) => PageObjects.lens.getDatatableCellText(index, 1))
      );
      expect(terms.map((term) => (term === 'Other' ? '__other__' : term))).to.eql(
        expectedData.map(({ x }) => x)
      );
      expect(values.map((value) => Math.round(100 * Number(value.replace(',', ''))) / 100)).to.eql(
        expectedData.map(({ y }) => y)
      );
    });

    it('should render metric', async () => {
      await PageObjects.lens.switchToVisualization('lnsMetric');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.assertMetric('Average of bytes', '5,727.322');
    });
  });
}
