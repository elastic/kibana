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
  const { visualize, lens, visChart, timePicker, visEditor } = getPageObjects([
    'visualize',
    'lens',
    'visChart',
    'timePicker',
    'visEditor',
  ]);

  const browser = getService('browser');
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
      await visualize.navigateToLensFromAnotherVisualization();
      const { bullet } = await lens.getCurrentChartDebugStateForVizType('gaugeChart');
      expect(bullet?.rows.length).to.be.equal(1);
      expect(bullet?.rows[0].length).to.be.equal(1);
      expect(bullet?.rows[0]).to.eql([
        {
          title: 'Count',
          subtype: BulletSubtype.twoThirdsCircle,
          value: 1.4005,
          colorBands: ['#2f7e54'],
          ticks: [0, 1],
          domain: [0, 1],
        },
      ]);
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisualization();

      const { bullet } = await lens.getCurrentChartDebugStateForVizType('gaugeChart');
      expect(await lens.getLayerCount()).to.be(1);
      expect(bullet?.rows.length).to.be.equal(1);
      expect(bullet?.rows[0].length).to.be.equal(1);
      expect(bullet?.rows[0]).to.eql([
        {
          title: 'Average machine.ram',
          subtype: BulletSubtype.twoThirdsCircle,
          value: 1310403.608061489,
          colorBands: ['#2f7e54'],
          ticks: [0, 1],
          domain: [0, 1],
        },
      ]);
    });

    it('should convert sibling pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisualization();
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
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
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

      await visualize.navigateToLensFromAnotherVisualization();
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
          value: '65,047,486.03',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'osx',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '66,144,823.35',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win 7',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65,933,477.76',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win 8',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65,157,898.23',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: 'win xp',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '65,365,950.93',
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
        {
          title: undefined,
          subtitle: undefined,
          extraText: undefined,
          value: undefined,
          color: 'rgba(255, 255, 255, 1)',
          trendlineColor: undefined,
          showingBar: true,
          showingTrendline: false,
        },
      ]);

      await dimensions[0].click();

      await lens.openPalettePanel();
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        { stop: '0', color: 'rgba(0, 104, 55, 1)' },
        { stop: '50', color: 'rgba(165, 0, 38, 1)' },
        { stop: '100', color: undefined },
      ]);
    });
  });
}
