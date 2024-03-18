/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GaugeShapes } from '@kbn/visualizations-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');

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
      await PageObjects.lens.switchToVisualization('horizontalBullet', 'horizontal');
      await PageObjects.lens.waitForVisualization('gaugeChart');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('horizontal');
      expect(debugData?.title).to.be('Average of bytes');
      expect(Math.round(debugData?.value ?? 0)).to.be(5727);
      expect(debugData?.domain).to.eql([0, 10000]);
    });

    it('should reflect edits for gauge', async () => {
      await PageObjects.lens.switchToVisualization(GaugeShapes.HORIZONTAL_BULLET, 'horizontal');
      await PageObjects.lens.waitForVisualization('gaugeChart');
      await PageObjects.lens.configureDimension({
        dimension: 'lnsGauge_metricDimensionPanel > lns-dimensionTrigger',
        operation: 'count',
        field: 'Records',
        isPreviousIncompatible: false,
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

      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('horizontal');
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to vertical bullet chart without losing configuration', async () => {
      await PageObjects.lens.switchToVisualization(GaugeShapes.VERTICAL_BULLET, 'vertical');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('vertical');
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to arc gauge chart without losing configuration', async () => {
      await PageObjects.lens.switchToVisualization(GaugeShapes.ARC, 'arc');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('half-circle');
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to major arc gauge chart without losing configuration', async () => {
      await PageObjects.lens.switchToVisualization(GaugeShapes.MAJOR_ARC, 'major arc');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('two-thirds-circle');
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to circle gauge chart without losing configuration', async () => {
      await PageObjects.lens.switchToVisualization(GaugeShapes.CIRCLE, 'circle');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be('circle');
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should switch to table chart and filter not supported static values', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      const columnsCount = await PageObjects.lens.getCountOfDatatableColumns();
      expect(columnsCount).to.eql(1);
      expect(await PageObjects.lens.getDatatableHeaderText(0)).to.equal('Count of records');
    });
  });
}
