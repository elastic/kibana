/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visEditor, visualize, lens, timePicker } = getPageObjects([
    'visEditor',
    'visualize',
    'lens',
    'timePicker',
  ]);

  const testSubjects = getService('testSubjects');

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
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(true);
    });

    it('should convert to Lens', async () => {
      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('mtrVis');
      expect((await lens.getMetricVisualizationData()).length).to.be.equal(1);
      expect(await lens.getMetricVisualizationData()).to.eql([
        {
          title: 'Count',
          subtitle: undefined,
          extraText: '',
          value: '14.01K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
      ]);
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Average', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickGo();

      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(1);
      expect(await dimensions[0].getVisibleText()).to.be('Average machine.ram');

      expect((await lens.getMetricVisualizationData()).length).to.be.equal(1);
      expect(await lens.getMetricVisualizationData()).to.eql([
        {
          title: 'Average machine.ram',
          subtitle: undefined,
          extraText: '',
          value: '13.1B',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
      ]);
    });

    it('should convert sibling pipeline aggregation', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Max Bucket', 'metrics');
      await visEditor.clickGo();

      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('mtrVis');

      expect(await lens.getLayerCount()).to.be(1);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(await dimensions[0].getVisibleText()).to.be('Overall Max of Count');
      expect(await dimensions[1].getVisibleText()).to.be('@timestamp');

      expect((await lens.getMetricVisualizationData()).length).to.be.equal(1);
      expect(await lens.getMetricVisualizationData()).to.eql([
        {
          title: 'Overall Max of Count',
          subtitle: undefined,
          extraText: '',
          value: '1.44K',
          color: 'rgba(245, 247, 250, 1)',
          showingBar: false,
        },
      ]);
    });
  });
}
