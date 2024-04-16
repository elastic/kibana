/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulletSubtype } from '@elastic/charts';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, lens, timePicker, visEditor, visChart } = getPageObjects([
    'visualize',
    'lens',
    'timePicker',
    'visEditor',
    'visChart',
  ]);

  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');

  describe('Gauge', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickGauge();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
      await elasticChart.setNewChartUiDebugFlag(true);
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('gaugeChart');
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('gaugeChart');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 0');
      expect(await dimensions[2].getVisibleText()).to.be('Static value: 100');

      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.twoThirdsCircle);
      expect(debugData?.title).to.be('Average machine.ram');
      expect(Math.round(debugData?.value ?? 0)).to.be(13104036081);
      expect(debugData?.domain).to.eql([0, 100]);
    });

    it('should not convert aggregation with not supported field type', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');

      await visEditor.clickGo();

      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.be(false);
    });

    it('should convert color ranges', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');

      await visEditor.clickOptionsTab();
      await testSubjects.setValue('gaugeColorRange0__to', '10000');

      await testSubjects.setValue('gaugeColorRange1__from', '10000');
      await testSubjects.setValue('gaugeColorRange1__to', '20000');

      await testSubjects.setValue('gaugeColorRange2__from', '20000');
      await testSubjects.setValue('gaugeColorRange2__to', '30000');
      await testSubjects.click('gaugeColorRange__addRangeButton');

      await testSubjects.setValue('gaugeColorRange3__from', '30000');
      await testSubjects.setValue('gaugeColorRange3__to', '15000000000');

      await visChart.waitForVisualizationRenderingStabilized();

      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('gaugeChart');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 0');
      expect(await dimensions[2].getVisibleText()).to.be('Static value: 15000000000');

      const { bullet } = await elasticChart.getChartDebugData();
      const debugData = bullet?.rows[0][0];
      expect(debugData?.subtype).to.be(BulletSubtype.twoThirdsCircle);
      expect(debugData?.title).to.be('Average machine.ram');
      expect(Math.round(debugData?.value ?? 0)).to.be(13104036081);
      expect(debugData?.domain).to.eql([0, 15000000000]);

      await dimensions[0].click();

      await lens.openPalettePanel();
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        { stop: '0', color: 'rgba(0, 104, 55, 1)' },
        { stop: '10000', color: 'rgba(183, 224, 117, 1)' },
        { stop: '20000', color: 'rgba(253, 191, 111, 1)' },
        { stop: '30000', color: 'rgba(165, 0, 38, 1)' },
        { stop: '15000000000', color: undefined },
      ]);
    });
  });
}
