/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visEditor, visualize, lens, timePicker, visChart } = getPageObjects([
    'visEditor',
    'visualize',
    'visChart',
    'lens',
    'timePicker',
  ]);

  const testSubjects = getService('testSubjects');
  const find = getService('find');

  describe('Metric', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickMetric();
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
          value: '14.01K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
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
      expect(dimensions).to.have.length(1);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Average machine.ram',
          subtitle: undefined,
          extraText: '',
          value: '13.1B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
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
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Overall Max of Count');
      expect(await dimensions[1].getVisibleText()).to.be('@timestamp');

      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(1);
      expect(data).to.eql([
        {
          title: 'Overall Max of Count',
          subtitle: undefined,
          extraText: '',
          value: '1.44K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);
    });

    it('should not convert aggregation with not supported field type', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Top metrics', 'metrics');
      await visEditor.selectField('extension.raw', 'metrics');

      await visEditor.clickGo();

      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.be(false);
    });

    it('should convert color ranges', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickBucket('Split group');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');

      await visEditor.clickOptionsTab();
      await testSubjects.setValue('metricColorRange0__to', '10000');
      await testSubjects.click('metricColorRange__addRangeButton');

      await testSubjects.setValue('metricColorRange1__to', '20000');
      await visChart.waitForVisualizationRenderingStabilized();

      const backgroundButton = await find.byCssSelector('[data-text="Background"]');
      await backgroundButton.click();
      await visEditor.clickGo();

      await visualize.navigateToLensFromAnotherVisulization();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');
      expect(await dimensions[1].getVisibleText()).to.be('machine.os.raw: Descending');
      const data = await lens.getMetricVisualizationData();
      expect(data.length).to.be.equal(6);
      expect(data).to.eql([
        {
          title: 'osx',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13.23B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win 7',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13.19B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win xp',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13.07B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'win 8',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13.03B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: 'ios',
          subtitle: 'Average machine.ram',
          extraText: '',
          value: '13.01B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
          showingTrendline: false,
        },
        {
          title: undefined,
          subtitle: undefined,
          extraText: undefined,
          value: undefined,
          color: 'rgba(0, 0, 0, 0)',
          showingBar: false,
          showingTrendline: false,
        },
      ]);

      await dimensions[0].click();

      await lens.openPalettePanel('lnsMetric');
      const colorStops = await lens.getPaletteColorStops();

      expect(colorStops).to.eql([
        { stop: '0', color: 'rgba(0, 104, 55, 1)' },
        { stop: '10000', color: 'rgba(165, 0, 38, 1)' },
        { stop: '20000', color: undefined },
      ]);
    });
  });
}
