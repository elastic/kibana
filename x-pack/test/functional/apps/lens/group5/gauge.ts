/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulletSubtype } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, timePicker } = getPageObjects(['visualize', 'lens', 'timePicker']);
  const elasticChart = getService('elasticChart');
  const testSubjects = getService('testSubjects');

  describe('lens gauge', () => {
    before(async () => {
      await timePicker.setDefaultAbsoluteRangeViaUiSettings();
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
      await lens.waitForVisualization('xyVisChart');
    });

    it('should switch to gauge and render a gauge with default values', async () => {
      await lens.switchToVisualization('lnsGauge', 'gauge');
      await lens.waitForVisualization('gaugeChart');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.horizontal);
      expect(debugData?.title).to.be('Average of bytes');
      expect(Math.round(debugData?.value ?? 0)).to.be(5727);
      expect(debugData?.domain).to.eql([0, 10000]);
    });

    it('should reflect edits for gauge', async () => {
      await lens.switchToVisualization('lnsGauge', 'gauge');
      await lens.waitForVisualization('gaugeChart');
      await lens.configureDimension({
        dimension: 'lnsGauge_metricDimensionPanel > lns-dimensionTrigger',
        operation: 'count',
        field: 'Records',
        isPreviousIncompatible: false,
        keepOpen: true,
      });

      await testSubjects.setEuiSwitch('lnsDynamicColoringGaugeSwitch', 'check');
      await lens.closeDimensionEditor();

      await lens.openTextOptions();
      await lens.retrySetValue('lnsToolbarGaugeLabelMajor', 'custom title');
      await lens.retrySetValue('lnsToolbarGaugeLabelMinor-select', 'custom', {});
      await lens.retrySetValue('lnsToolbarGaugeLabelMinor', 'custom subtitle');

      await lens.waitForVisualization('gaugeChart');
      await lens.openDimensionEditor('lnsGauge_goalDimensionPanel > lns-empty-dimension');

      await lens.waitForVisualization('gaugeChart');
      await lens.closeDimensionEditor();
      await lens.openDimensionEditor(
        'lnsGauge_minDimensionPanel > lns-empty-dimension-suggested-value'
      );
      await lens.retrySetValue('lns-indexPattern-static_value-input', '1000');
      await lens.waitForVisualization('gaugeChart');
      await lens.closeDimensionEditor();

      await lens.openDimensionEditor(
        'lnsGauge_maxDimensionPanel > lns-empty-dimension-suggested-value'
      );
      await lens.retrySetValue('lns-indexPattern-static_value-input', '25000');
      await lens.waitForVisualization('gaugeChart');
      await lens.closeDimensionEditor();

      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.horizontal);
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to vertical bullet chart without losing configuration', async () => {
      await lens.openVisualOptions();
      await testSubjects.click('lns_gaugeOrientation_verticalBullet');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.vertical);
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to minor arc gauge chart without losing configuration', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Minor arc');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.halfCircle);
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to arc gauge chart without losing configuration', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Major arc');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.twoThirdsCircle);
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should seamlessly switch to circular gauge chart without losing configuration', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Circle');
      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.circle);
      expect(debugData?.title).to.be('custom title');
      expect(debugData?.subtitle).to.be('custom subtitle');
      expect(debugData?.value).to.be(14005);
      expect(debugData?.target).to.be(11250);
      expect(debugData?.domain).to.eql([1000, 25000]);
    });
    it('should switch to table chart and filter not supported static values', async () => {
      await lens.switchToVisualization('lnsDatatable');
      const columnsCount = await lens.getCountOfDatatableColumns();
      expect(columnsCount).to.eql(1);
      expect(await lens.getDatatableHeaderText(0)).to.equal('Count of records');
    });
  });
}
