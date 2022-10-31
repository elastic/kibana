/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, lens, visChart, timePicker, visEditor } = getPageObjects([
    'visualize',
    'lens',
    'visChart',
    'timePicker',
    'visEditor',
  ]);

  const testSubjects = getService('testSubjects');

  describe('Goal', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickGoal();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert to Lens', async () => {
      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');
      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Count',
          subtitle: undefined,
          extraText: '',
          value: '140.05%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
      ]);
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 1');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Average machine.ram',
          subtitle: undefined,
          extraText: '',
          value: '131.04M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
      ]);
    });

    it('should convert sibling pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Overall Max of Count');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 1');
      expect(await dimensions[2].getVisibleText()).to.be('@timestamp');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Overall Max of Count',
          subtitle: undefined,
          extraText: '',
          value: '14.37%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
      ]);
    });

    it('should convert color ranges', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickBucket('Split group');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');

      await visEditor.clickOptionsTab();
      await testSubjects.setValue('gaugeColorRange0__to', '10000');
      await testSubjects.click('gaugeColorRange__addRangeButton');

      await testSubjects.setValue('gaugeColorRange1__to', '20000');
      await visChart.waitForVisualizationRenderingStabilized();

      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(3);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('Static value: 1');
      expect(await dimensions[2].getVisibleText()).to.be('machine.os.raw: Descending');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(6);
      expect(data).to.eql([
        {
          title: 'ios',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65.05M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'osx',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '66.14M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win 7',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65.93M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win 8',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65.16M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win xp',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65.37M%',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: undefined,
          subtitle: undefined,
          extraText: undefined,
          value: undefined,
          color: 'rgba(0, 0, 0, 0)',
          showingBar: true,
          showingTrendline: false,
        },
      ]);

      await dimensions[0].click();

      await lens.openPalettePanel('lnsMetric');
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        { stop: '0', color: 'rgba(0, 104, 55, 1)' },
        { stop: '50', color: 'rgba(165, 0, 38, 1)' },
        { stop: '100', color: undefined },
      ]);
    });
  });
}
