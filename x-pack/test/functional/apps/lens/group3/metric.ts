/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '../../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const findService = getService('find');
  const testSubjects = getService('testSubjects');
  const filterBar = getService('filterBar');
  const retry = getService('retry');

  const getMetricTiles = () =>
    findService.allByCssSelector('[data-test-subj="mtrVis"] .echChart li');

  const getIfExists = async (selector: string, container: WebElementWrapper) =>
    (await findService.descendantExistsByCssSelector(selector, container))
      ? await container.findByCssSelector(selector)
      : undefined;

  const getMetricDatum = async (tile: WebElementWrapper) => {
    return {
      title: await (await getIfExists('h2', tile))?.getVisibleText(),
      subtitle: await (await getIfExists('.echMetricText__subtitle', tile))?.getVisibleText(),
      extraText: await (await getIfExists('.echMetricText__extra', tile))?.getVisibleText(),
      value: await (await getIfExists('.echMetricText__value', tile))?.getVisibleText(),
      color: await (await getIfExists('.echMetric', tile))?.getComputedStyle('background-color'),
    };
  };

  const getMetricData = async () => {
    const tiles = await getMetricTiles();
    const showingBar = Boolean(await findService.existsByCssSelector('.echSingleMetricProgress'));

    const metricData = [];
    for (const tile of tiles) {
      metricData.push({
        ...(await getMetricDatum(tile)),
        showingBar,
      });
    }
    return metricData;
  };

  const clickMetric = async (title: string) => {
    const tiles = await getMetricTiles();
    for (const tile of tiles) {
      const datum = await getMetricDatum(tile);
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

      await PageObjects.lens.switchToVisualization('lnsMetricNew', 'Metric');

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

      expect((await getMetricData()).length).to.be.equal(1);

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect(await getMetricData()).to.eql([
        {
          title: '97.220.3.248',
          subtitle: 'Average of bytes',
          extraText: '19.76K',
          value: '19.76K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
        {
          title: '169.228.188.120',
          subtitle: 'Average of bytes',
          extraText: '18.99K',
          value: '18.99K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
        {
          title: '78.83.247.30',
          subtitle: 'Average of bytes',
          extraText: '17.25K',
          value: '17.25K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
        {
          title: '226.82.228.233',
          subtitle: 'Average of bytes',
          extraText: '15.69K',
          value: '15.69K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
        {
          title: '93.28.27.24',
          subtitle: 'Average of bytes',
          extraText: '15.61K',
          value: '15.61K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
        {
          title: 'Other',
          subtitle: 'Average of bytes',
          extraText: '5.72K',
          value: '5.72K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
      ]);

      await PageObjects.lens.openDimensionEditor(
        'lnsMetric_maxDimensionPanel > lns-empty-dimension'
      );

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect((await getMetricData())[0].showingBar).to.be(true);

      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.removeDimension('lnsMetric_maxDimensionPanel');
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

      colorPicker.clearValue();
      await colorPicker.type('#000000');

      await PageObjects.lens.waitForVisualization('mtrVis');

      const data = await getMetricData();

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

      const data = await getMetricData();
      expect(data.map(({ color }) => color)).to.eql(expectedDynamicColors);
    });

    it('converts color stops to number', async () => {
      await PageObjects.lens.openPalettePanel('lnsMetric');
      await testSubjects.click('lnsPalettePanel_dynamicColoring_rangeType_groups_number');
      expect([
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_1', 'value'),
        await testSubjects.getAttribute('lnsPalettePanel_dynamicColoring_range_value_2', 'value'),
      ]).to.be.eql(['10400.18', '15077.59']);

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect((await getMetricData()).map(({ color }) => color)).to.eql(expectedDynamicColors); // colors shouldn't change
    });

    it("doesn't error with empty formula", async () => {
      await PageObjects.lens.closePaletteEditor();

      await PageObjects.lens.switchToFormula();
      await PageObjects.lens.typeFormula('');

      await PageObjects.lens.waitForVisualization('mtrVis');
    });
  });
}
