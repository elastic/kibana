/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, common } = getPageObjects(['visualize', 'lens', 'common']);
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const inspector = getService('inspector');

  const inspectorTrendlineData = [
    ['2015-09-19 06:00', '-'],
    ['2015-09-19 09:00', '-'],
    ['2015-09-19 12:00', '-'],
    ['2015-09-19 15:00', '-'],
    ['2015-09-19 18:00', '-'],
    ['2015-09-19 21:00', '-'],
    ['2015-09-20 00:00', '6,011.351'],
    ['2015-09-20 03:00', '5,849.901'],
    ['2015-09-20 06:00', '5,722.622'],
    ['2015-09-20 09:00', '5,769.092'],
    ['2015-09-20 12:00', '5,740.875'],
    ['2015-09-20 15:00', '5,520.429'],
    ['2015-09-20 18:00', '5,153.053'],
    ['2015-09-20 21:00', '6,656.581'],
    ['2015-09-21 00:00', '5,139.357'],
    ['2015-09-21 03:00', '5,884.891'],
    ['2015-09-21 06:00', '5,683.283'],
    ['2015-09-21 09:00', '5,863.661'],
    ['2015-09-21 12:00', '5,657.531'],
    ['2015-09-21 15:00', '5,841.935'],
  ];

  const inspectorExpectedTrenlineDataWithBreakdown = [
    ['97.220.3.248', '2015-09-19 06:00', '-'],
    ['97.220.3.248', '2015-09-19 09:00', '-'],
    ['97.220.3.248', '2015-09-19 12:00', '-'],
    ['97.220.3.248', '2015-09-19 15:00', '-'],
    ['97.220.3.248', '2015-09-19 18:00', '-'],
    ['97.220.3.248', '2015-09-19 21:00', '-'],
    ['97.220.3.248', '2015-09-20 00:00', '-'],
    ['97.220.3.248', '2015-09-20 03:00', '-'],
    ['97.220.3.248', '2015-09-20 06:00', '-'],
    ['97.220.3.248', '2015-09-20 09:00', '-'],
    ['97.220.3.248', '2015-09-20 12:00', '-'],
    ['97.220.3.248', '2015-09-20 15:00', '-'],
    ['97.220.3.248', '2015-09-20 18:00', '-'],
    ['97.220.3.248', '2015-09-20 21:00', '-'],
    ['97.220.3.248', '2015-09-21 00:00', '-'],
    ['97.220.3.248', '2015-09-21 03:00', '-'],
    ['97.220.3.248', '2015-09-21 06:00', '-'],
    ['97.220.3.248', '2015-09-21 09:00', '19,755'],
    ['97.220.3.248', '2015-09-21 12:00', '-'],
    ['97.220.3.248', '2015-09-21 15:00', '-'],
  ];

  const clickMetric = async (title: string) => {
    const tiles = await lens.getMetricTiles();
    for (const tile of tiles) {
      const datum = await lens.getMetricDatum(tile);
      if (datum.title === title) {
        await tile.click();
        return;
      }
    }
  };

  describe('lens metric', () => {
    it('should render a metric', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('lnsMetric', 'Metric');

      await lens.configureDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect((await lens.getMetricVisualizationData()).length).to.be.equal(1);
    });

    it('should enable trendlines', async () => {
      // trendline data without the breakdown
      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );
      await testSubjects.click('lnsMetric_supporting_visualization_trendline');
      await lens.closeDimensionEditor();

      await inspector.open('lnsApp_inspectButton');

      const trendLineData = await inspector.getTableDataWithId('inspectorTableChooser1');
      expect(trendLineData).to.eql(inspectorTrendlineData);
      await inspector.close();
    });

    it('should enable metric with breakdown', async () => {
      // trendline data without the breakdown
      await lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.waitForVisualization('mtrVis');
      const data = await lens.getMetricVisualizationData();

      const expectedData = [
        {
          title: '97.220.3.248',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 19,755',
          value: '19,755',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
        {
          title: '169.228.188.120',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 18,994',
          value: '18,994',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
        {
          title: '78.83.247.30',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 17,246',
          value: '17,246',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
        {
          title: '226.82.228.233',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 15,687',
          value: '15,687',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
        {
          title: '93.28.27.24',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 15,614.333',
          value: '15,614.333',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
        {
          title: 'Other',
          subtitle: 'Average of bytes',
          extraText: 'Average of bytes 5,722.775',
          value: '5,722.775',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: 'rgba(255, 255, 255, 1)',
          showingTrendline: true,
          showingBar: false,
        },
      ];
      expect(data).to.eql(expectedData);

      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_none');
      await lens.closeDimensionEditor();

      await lens.waitForVisualization('mtrVis');
    });

    it('should enable bar with max dimension', async () => {
      await lens.openDimensionEditor('lnsMetric_maxDimensionPanel > lns-empty-dimension');

      await lens.waitForVisualization('mtrVis');

      expect((await lens.getMetricVisualizationData())[0].showingBar).to.be(true);

      await lens.closeDimensionEditor();
      await lens.removeDimension('lnsMetric_maxDimensionPanel');
    });

    it('should enable trendlines with breakdown', async () => {
      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_trendline');

      await lens.waitForVisualization('mtrVis');

      expect(
        (await lens.getMetricVisualizationData()).some((datum) => datum.showingTrendline)
      ).to.be(true);
      await lens.closeDimensionEditor();

      await inspector.open('lnsApp_inspectButton');

      const trendLineData = await inspector.getTableDataWithId('inspectorTableChooser1');
      expect(trendLineData).to.eql(inspectorExpectedTrenlineDataWithBreakdown);
      await inspector.close();

      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_none');

      await lens.waitForVisualization('mtrVis');

      expect(
        (await lens.getMetricVisualizationData()).some((datum) => datum.showingTrendline)
      ).to.be(false);

      await lens.closeDimensionEditor();
    });

    it('should filter by click', async () => {
      expect((await filterBar.getFiltersLabel()).length).to.be(0);
      const title = '93.28.27.24';
      await clickMetric(title);

      await retry.try(async () => {
        const labels = await filterBar.getFiltersLabel();
        expect(labels.length).to.be(1);
        expect(labels[0]).to.be(`ip: ${title}`);
      });

      await filterBar.removeAllFilters();
      await lens.waitForVisualization('mtrVis');
    });

    it('applies static color', async () => {
      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      const colorPicker = await testSubjects.find('euiColorPickerAnchor');

      await colorPicker.clearValue();
      await colorPicker.type('#000000');

      await lens.waitForVisualization('mtrVis');

      const data = await lens.getMetricVisualizationData();

      expect(data.map(({ color }) => color)).to.be.eql(new Array(6).fill('rgba(0, 0, 0, 1)'));
    });

    const expectedDynamicColors = [
      'rgba(246, 109, 100, 1)',
      'rgba(246, 109, 100, 1)',
      'rgba(246, 109, 100, 1)',
      'rgba(246, 109, 100, 1)',
      'rgba(246, 109, 100, 1)',
      'rgba(35, 190, 143, 1)',
    ];

    it('applies dynamic color', async () => {
      await testSubjects.click('lnsMetric_color_mode_dynamic');

      await lens.waitForVisualization('mtrVis');

      const data = await lens.getMetricVisualizationData();
      expect(data.map(({ color }) => color)).to.eql(expectedDynamicColors);
    });

    it('converts color stops to number', async () => {
      await lens.openPalettePanel();
      await common.sleep(1000);
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      expect([
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_1', 'value'),
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_2', 'value'),
      ]).to.be.eql(['10400.18', '15077.59']);

      await lens.waitForVisualization('mtrVis');

      expect((await lens.getMetricVisualizationData()).map(({ color }) => color)).to.eql(
        expectedDynamicColors
      ); // colors shouldn't change

      await lens.closePaletteEditor();
      await lens.closeDimensionEditor();
    });

    it('makes visualization scrollable if too tall', async () => {
      await lens.removeDimension('lnsMetric_breakdownByDimensionPanel');

      await lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        keepOpen: true,
      });

      await testSubjects.setValue('lnsMetric_max_cols', '1');

      await lens.waitForVisualization('mtrVis');

      await lens.closeDimensionEditor();

      const tiles = await await lens.getMetricTiles();
      const lastTile = tiles[tiles.length - 1];

      const initialPosition = await lastTile.getPosition();
      await lastTile.scrollIntoViewIfNecessary();
      const scrolledPosition = await lastTile.getPosition();
      expect(scrolledPosition.y).to.be.below(initialPosition.y);
    });

    it("doesn't error with empty formula", async () => {
      await lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await lens.switchToFormula();
      await lens.typeFormula('');

      await lens.waitForVisualization('mtrVis');
    });

    it('does carry custom formatting when transitioning from other visualization', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      await lens.switchToVisualization('lnsLegacyMetric');
      // await lens.clickLegacyMetric();
      await lens.configureDimension({
        dimension: 'lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
        keepOpen: true,
      });
      await lens.editDimensionFormat('Number', { decimals: 3, prefix: ' blah' });
      await lens.closeDimensionEditor();

      await lens.switchToVisualization('lnsMetric', 'Metric');
      await lens.waitForVisualization('mtrVis');
      const [{ value }] = await lens.getMetricVisualizationData();
      expect(value).contain('blah');

      // Extract the numeric decimals from the value without any compact suffix like k or m
      const decimals = (value?.split(`.`)[1] || '').match(/(\d)+/)?.[0];
      expect(decimals).have.length(3);
    });
  });
}
