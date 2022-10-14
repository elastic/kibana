/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visEditor, lens, timePicker, header, visChart } = getPageObjects([
    'visualize',
    'lens',
    'visEditor',
    'timePicker',
    'header',
    'visChart',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('XY', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickLineChart();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(true);
    });

    it('should hide the "Edit Visualization in Lens" menu item if dot size aggregation is defined', async () => {
      await visEditor.clickBucket('Dot size', 'metrics');
      await visEditor.selectAggregation('Max', 'metrics');
      await visEditor.selectField('memory', 'metrics');
      await visEditor.clickGo(isNewChartsLibraryEnabled);
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(false);
    });

    it('should convert to Lens', async () => {
      await visEditor.clickBucket('Split series');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await header.waitUntilLoadingHasFinished();
      await visEditor.clickGo(isNewChartsLibraryEnabled);
      const expectedData = await visChart.getLegendEntriesXYCharts('xyVisChart');

      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('xyVisChart');
      const data = await lens.getCurrentChartDebugState('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('Count');
        expect(await dimensions[1].getVisibleText()).to.be('machine.os.raw: Descending');
      });
      expect(data?.legend?.items.map((item) => item.name)).to.eql(expectedData);
    });
  });
}
