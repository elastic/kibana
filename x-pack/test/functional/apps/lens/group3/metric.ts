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

  const getMetricTiles = () =>
    findService.allByCssSelector('[data-test-subj="mtrVis"] .echChart li');

  const getTextIfExists = async (selector: string, container: WebElementWrapper) =>
    (await findService.descendantExistsByCssSelector(selector, container))
      ? await (await container.findByCssSelector(selector)).getVisibleText()
      : '';

  const getMetricDatum = async (tile: WebElementWrapper) => ({
    title: await getTextIfExists('h2', tile),
    subtitle: await getTextIfExists('.echMetricText__subtitle', tile),
    extraText: await getTextIfExists('.echMetricText__extra', tile),
    value: await getTextIfExists('.echMetricText__value', tile),
  });

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
        tile.click();
      }
    }
  };

  describe('lens metric', () => {
    it('should render a metric', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      // await elasticChart.setNewChartUiDebugFlag(true);
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
          showingBar: false,
        },
        {
          title: '169.228.188.120',
          subtitle: 'Average of bytes',
          extraText: '18.99K',
          value: '18.99K',
          showingBar: false,
        },
        {
          title: '78.83.247.30',
          subtitle: 'Average of bytes',
          extraText: '17.25K',
          value: '17.25K',
          showingBar: false,
        },
        {
          title: '226.82.228.233',
          subtitle: 'Average of bytes',
          extraText: '15.69K',
          value: '15.69K',
          showingBar: false,
        },
        {
          title: '93.28.27.24',
          subtitle: 'Average of bytes',
          extraText: '15.61K',
          value: '15.61K',
          showingBar: false,
        },
        {
          title: 'Other',
          subtitle: 'Average of bytes',
          extraText: '5.72K',
          value: '5.72K',
          showingBar: false,
        },
      ]);

      await testSubjects.click('lnsMetric_maxDimensionPanel > lns-empty-dimension');

      await PageObjects.lens.waitForVisualization('mtrVis');

      expect((await getMetricData())[0].showingBar).to.be(true);
    });

    it('should filter by click', async () => {
      expect((await filterBar.getFiltersLabel()).length).to.be(0);
      const title = '93.28.27.24';
      await clickMetric(title);
      const labels = await filterBar.getFiltersLabel();
      expect(labels.length).to.be(1);
      expect(labels[0]).to.be(`ip: ${title}`);
      await filterBar.removeAllFilters();
    });
    it('applies static color', async () => {});
    it('applies dynamic color', async () => {});
    it('converts color stops to number', async () => {});
    it("doesn't error with empty formula", async () => {});
  });
}
