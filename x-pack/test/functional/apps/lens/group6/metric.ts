/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const retry = getService('retry');
  const inspector = getService('inspector');

  const inspectorTrendlineData = [
    ['2015-09-19 06:00', 'null'],
    ['2015-09-19 09:00', 'null'],
    ['2015-09-19 12:00', 'null'],
    ['2015-09-19 15:00', 'null'],
    ['2015-09-19 18:00', 'null'],
    ['2015-09-19 21:00', 'null'],
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
    ['97.220.3.248', '2015-09-19 06:00', 'null'],
    ['97.220.3.248', '2015-09-19 09:00', 'null'],
    ['97.220.3.248', '2015-09-19 12:00', 'null'],
    ['97.220.3.248', '2015-09-19 15:00', 'null'],
    ['97.220.3.248', '2015-09-19 18:00', 'null'],
    ['97.220.3.248', '2015-09-19 21:00', 'null'],
    ['97.220.3.248', '2015-09-20 00:00', 'null'],
    ['97.220.3.248', '2015-09-20 03:00', 'null'],
    ['97.220.3.248', '2015-09-20 06:00', 'null'],
    ['97.220.3.248', '2015-09-20 09:00', 'null'],
    ['97.220.3.248', '2015-09-20 12:00', 'null'],
    ['97.220.3.248', '2015-09-20 15:00', 'null'],
    ['97.220.3.248', '2015-09-20 18:00', 'null'],
    ['97.220.3.248', '2015-09-20 21:00', 'null'],
    ['97.220.3.248', '2015-09-21 00:00', 'null'],
    ['97.220.3.248', '2015-09-21 03:00', 'null'],
    ['97.220.3.248', '2015-09-21 06:00', 'null'],
    ['97.220.3.248', '2015-09-21 09:00', '19,755'],
    ['97.220.3.248', '2015-09-21 12:00', 'null'],
    ['97.220.3.248', '2015-09-21 15:00', 'null'],
  ];

  const clickMetric = async (title: string) => {
    const tiles = await PageObjects.lens.getMetricTiles();
    for (const tile of tiles) {
      const datum = await PageObjects.lens.getMetricDatum(tile);
      if (datum.title === title) {
        await tile.click();
        return;
      }
    }
  };

  describe('lens metric', () => {
    it('should render a metric', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.switchToVisualization('lnsMetric', 'Metric');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_primaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_secondaryMetricDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      expect((await PageObjects.lens.getMetricVisualizationData()).length).to.be.equal(1);
    });

    it('should enable trendlines', async () => {
      // trendline data without the breakdown
      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );
      await testSubjects.click('lnsMetric_supporting_visualization_trendline');
      await PageObjects.lens.closeDimensionEditor();

      await inspector.open('lnsApp_inspectButton');

      const trendLineData = await inspector.getTableDataWithId('inspectorTableChooser1');
      expect(trendLineData).to.eql(inspectorTrendlineData);
      await inspector.close();
    });

    it('should enable metric with breakdown', async () => {
      // trendline data without the breakdown
      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.waitForVisualization('mtrVis');
      const data = await PageObjects.lens.getMetricVisualizationData();

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

      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_none');
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.waitForVisualization('mtrVis');
    });

    it('should enable bar with max dimension', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_maxDimensionPanel > lns-empty-dimension'
      );

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect((await PageObjects.lens.getMetricVisualizationData())[0].showingBar).to.be(true);

      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.removeDimension('lnsMetric_maxDimensionPanel');
    });

    it('should enable trendlines with breakdown', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_trendline');

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect(
        (await PageObjects.lens.getMetricVisualizationData()).some(
          (datum) => datum.showingTrendline
        )
      ).to.be(true);
      await PageObjects.lens.closeDimensionEditor();

      await inspector.open('lnsApp_inspectButton');

      const trendLineData = await inspector.getTableDataWithId('inspectorTableChooser1');
      expect(trendLineData).to.eql(inspectorExpectedTrenlineDataWithBreakdown);
      await inspector.close();

      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await testSubjects.click('lnsMetric_supporting_visualization_none');

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect(
        (await PageObjects.lens.getMetricVisualizationData()).some(
          (datum) => datum.showingTrendline
        )
      ).to.be(false);

      await PageObjects.lens.closeDimensionEditor();
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
      await PageObjects.lens.waitForVisualization('mtrVis');
    });

    it('applies static color', async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      const colorPicker = await testSubjects.find('euiColorPickerAnchor');

      await colorPicker.clearValue();
      await colorPicker.type('#000000');

      await PageObjects.lens.waitForVisualization('mtrVis');

      const data = await PageObjects.lens.getMetricVisualizationData();

      expect(data.map(({ color }) => color)).to.be.eql(new Array(6).fill('rgba(0, 0, 0, 1)'));
    });

    const expectedDynamicColors = [
      'rgba(204, 86, 66, 1)',
      'rgba(204, 86, 66, 1)',
      'rgba(204, 86, 66, 1)',
      'rgba(204, 86, 66, 1)',
      'rgba(204, 86, 66, 1)',
      'rgba(32, 146, 128, 1)',
    ];

    it('applies dynamic color', async () => {
      await testSubjects.click('lnsMetric_color_mode_dynamic');

      await PageObjects.lens.waitForVisualization('mtrVis');

      const data = await PageObjects.lens.getMetricVisualizationData();
      expect(data.map(({ color }) => color)).to.eql(expectedDynamicColors);
    });

    it('converts color stops to number', async () => {
      await PageObjects.lens.openPalettePanel();
      await PageObjects.common.sleep(1000);
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      expect([
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_1', 'value'),
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_2', 'value'),
      ]).to.be.eql(['10400.18', '15077.59']);

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect(
        (await PageObjects.lens.getMetricVisualizationData()).map(({ color }) => color)
      ).to.eql(expectedDynamicColors); // colors shouldn't change

      await PageObjects.lens.closePaletteEditor();
      await PageObjects.lens.closeDimensionEditor();
    });

    it('makes visualization scrollable if too tall', async () => {
      await PageObjects.lens.removeDimension('lnsMetric_breakdownByDimensionPanel');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
        keepOpen: true,
      });

      await testSubjects.setValue('lnsMetric_max_cols', '1');

      await PageObjects.lens.waitForVisualization('mtrVis');

      await PageObjects.lens.closeDimensionEditor();

      const tiles = await await PageObjects.lens.getMetricTiles();
      const lastTile = tiles[tiles.length - 1];

      const initialPosition = await lastTile.getPosition();
      await lastTile.scrollIntoViewIfNecessary();
      const scrolledPosition = await lastTile.getPosition();
      expect(scrolledPosition.y).to.be.below(initialPosition.y);
    });

    it("doesn't error with empty formula", async () => {
      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_primaryMetricDimensionPanel > lns-dimensionTrigger'
      );

      await PageObjects.lens.switchToFormula();
      await PageObjects.lens.typeFormula('');

      await PageObjects.lens.waitForVisualization('mtrVis');
    });

    it('does carry custom formatting when transitioning from other visualization', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.switchToVisualization('lnsLegacyMetric');
      // await PageObjects.lens.clickLegacyMetric();
      await PageObjects.lens.configureDimension({
        dimension: 'lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
        keepOpen: true,
      });
      await PageObjects.lens.editDimensionFormat('Number', { decimals: 3, prefix: ' blah' });
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.switchToVisualization('lnsMetric', 'Metric');
      await PageObjects.lens.waitForVisualization('mtrVis');
      const [{ value }] = await PageObjects.lens.getMetricVisualizationData();
      expect(value).contain('blah');

      // Extract the numeric decimals from the value without any compact suffix like k or m
      const decimals = (value?.split(`.`)[1] || '').match(/(\d)+/)?.[0];
      expect(decimals).have.length(3);
    });
  });
}
