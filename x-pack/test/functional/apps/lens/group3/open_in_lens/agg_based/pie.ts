/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visEditor, lens, timePicker, header } = getPageObjects([
    'visualize',
    'lens',
    'visEditor',
    'timePicker',
    'header',
  ]);

  const testSubjects = getService('testSubjects');
  const pieChart = getService('pieChart');

  describe('Pie', function describeIndexTests() {
    const isNewChartsLibraryEnabled = true;

    before(async () => {
      await visualize.initTests(isNewChartsLibraryEnabled);
    });

    beforeEach(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickPieChart();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should hide the "Edit Visualization in Lens" menu item if no split slices were defined', async () => {
      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(false);
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await header.waitUntilLoadingHasFinished();
      await visEditor.clickGo(isNewChartsLibraryEnabled);

      const button = await testSubjects.exists('visualizeEditInLensButton');
      expect(button).to.eql(true);
    });

    it('should convert to Lens', async () => {
      const expectedTableData = ['ios', 'osx', 'win 7', 'win 8', 'win xp'];
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await header.waitUntilLoadingHasFinished();
      await visEditor.clickGo(isNewChartsLibraryEnabled);

      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('partitionVisChart');

      await pieChart.expectPieChartLabels(expectedTableData, isNewChartsLibraryEnabled);
    });
  });
}
