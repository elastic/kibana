/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('lens gauge', () => {
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

    it('should switch to gauge and render a gauge with default values', async () => {
      await PageObjects.lens.switchToVisualization('horizontalBullet', 'gauge');
      await PageObjects.lens.waitForVisualization('gaugeChart');
      const elementWithInfo = await find.byCssSelector('.echScreenReaderOnly');
      const textContent = await elementWithInfo.getAttribute('textContent');
      expect(textContent).to.contain('Average of bytes'); // it gets default title
      expect(textContent).to.contain('horizontalBullet chart');
      expect(textContent).to.contain('Minimum:0'); // it gets default minimum static value
      expect(textContent).to.contain('Maximum:10000'); // it gets default maximum static value
      expect(textContent).to.contain('Value:5727.32');
    });

    it('should reflect edits for gauge', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsGauge_metricDimensionPanel > lns-dimensionTrigger',
        operation: 'count',
        isPreviousIncompatible: true,
        keepOpen: true,
      });

      await testSubjects.setEuiSwitch('lnsDynamicColoringGaugeSwitch', 'check');
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.openVisualOptions();
      await PageObjects.lens.retrySetValue('lnsToolbarGaugeLabelMajor', 'custom title');
      await PageObjects.lens.retrySetValue('lnsToolbarGaugeLabelMinor-select', 'custom', {});
      await PageObjects.lens.retrySetValue('lnsToolbarGaugeLabelMinor', 'custom subtitle');

      await PageObjects.lens.waitForVisualization('gaugeChart');
      await PageObjects.lens.openDimensionEditor(
        'lnsGauge_goalDimensionPanel > lns-empty-dimension'
      );

      await PageObjects.lens.waitForVisualization('gaugeChart');
      await PageObjects.lens.closeDimensionEditor();
      await PageObjects.lens.openDimensionEditor(
        'lnsGauge_minDimensionPanel > lns-empty-dimension-suggested-value'
      );
      await PageObjects.lens.retrySetValue('lns-indexPattern-static_value-input', '1000');
      await PageObjects.lens.waitForVisualization('gaugeChart');
      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.openDimensionEditor(
        'lnsGauge_maxDimensionPanel > lns-empty-dimension-suggested-value'
      );
      await PageObjects.lens.retrySetValue('lns-indexPattern-static_value-input', '25000');
      await PageObjects.lens.waitForVisualization('gaugeChart');
      await PageObjects.lens.closeDimensionEditor();

      const elementWithInfo = await find.byCssSelector('.echScreenReaderOnly');
      const textContent = await elementWithInfo.getAttribute('textContent');
      expect(textContent).to.contain('custom title');
      expect(textContent).to.contain('custom subtitle');
      expect(textContent).to.contain('horizontalBullet chart');
      expect(textContent).to.contain('Minimum:1000');
      expect(textContent).to.contain('Maximum:25000');
      expect(textContent).to.contain('Target:11250');
      expect(textContent).to.contain('Value:14005');
    });
    it('should seamlessly switch to vertical chart without losing configuration', async () => {
      await PageObjects.lens.switchToVisualization('verticalBullet', 'gauge');
      const elementWithInfo = await find.byCssSelector('.echScreenReaderOnly');
      const textContent = await elementWithInfo.getAttribute('textContent');
      expect(textContent).to.contain('custom title');
      expect(textContent).to.contain('custom subtitle');
      expect(textContent).to.contain('verticalBullet chart');
      expect(textContent).to.contain('Minimum:1000');
      expect(textContent).to.contain('Maximum:25000');
      expect(textContent).to.contain('Target:11250');
      expect(textContent).to.contain('Value:14005');
    });
    it('should switch to table chart and filter not supported static values', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      const columnsCount = await PageObjects.lens.getCountOfDatatableColumns();
      expect(columnsCount).to.eql(1);
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('Count of records');
    });
  });
}
