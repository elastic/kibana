/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visEditor, lens, timePicker, header } = getPageObjects([
    'visualize',
    'lens',
    'visEditor',
    'timePicker',
    'header',
  ]);

  const pieChart = getService('pieChart');
  const testSubjects = getService('testSubjects');

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
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should hide the "Edit Visualization in Lens" menu item if more than 3 split slices were defined', async () => {
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms', 'buckets', false, 1);
      await visEditor.selectField('bytes', 'buckets', false, 1);
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms', 'buckets', false, 2);
      await visEditor.selectField('bytes', 'buckets', false, 2);
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms', 'buckets', false, 3);
      await visEditor.selectField('bytes', 'buckets', false, 3);
      await header.waitUntilLoadingHasFinished();
      expect(await visualize.hasNavigateToLensButton()).to.eql(false);
    });

    it('should show the "Edit Visualization in Lens" menu item', async () => {
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await header.waitUntilLoadingHasFinished();
      await visEditor.clickGo(isNewChartsLibraryEnabled);

      expect(await visualize.hasNavigateToLensButton()).to.eql(true);
    });

    it('should convert aggregation with params', async () => {
      await visEditor.clickMetricEditor();
      await visEditor.selectAggregation('Sum', 'metrics');
      await visEditor.selectField('machine.ram', 'metrics');
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo();
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('partitionVisChart');

      expect(await lens.getLayerCount()).to.be(1);

      const sliceByText = await lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel', 0);
      const sizeByText = await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel', 0);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(sliceByText).to.be('machine.os.raw: Descending');
      expect(sizeByText).to.be('Sum of machine.ram');
    });

    it('should convert terms to slice by', async () => {
      const expectedTableData = ['ios', 'osx', 'win 7', 'win 8', 'win xp'];
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');
      await visEditor.clickGo(isNewChartsLibraryEnabled);
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('partitionVisChart');

      const sliceByText = await lens.getDimensionTriggerText('lnsPie_sliceByDimensionPanel', 0);
      const sizeByText = await lens.getDimensionTriggerText('lnsPie_sizeByDimensionPanel', 0);

      const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
      expect(dimensions).to.have.length(2);
      expect(sliceByText).to.be('machine.os.raw: Descending');
      expect(sizeByText).to.be('Count');

      await pieChart.expectPieChartLabels(expectedTableData, isNewChartsLibraryEnabled);
    });

    it('should convert types correctly', async () => {
      await visEditor.clickBucket('Split slices');
      await visEditor.selectAggregation('Terms');
      await visEditor.selectField('machine.os.raw');

      await visEditor.clickGo(isNewChartsLibraryEnabled);
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('partitionVisChart');

      let chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      let type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Donut');

      const goBackBtn = await testSubjects.find('lnsApp_goBackToAppButton');
      await goBackBtn.click();

      await visEditor.clickOptionsTab();
      const isDonutButton = await testSubjects.find('visTypePieIsDonut');
      await isDonutButton.click();
      await visEditor.clickGo(isNewChartsLibraryEnabled);
      await header.waitUntilLoadingHasFinished();

      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('partitionVisChart');

      chartSwitcher = await testSubjects.find('lnsChartSwitchPopover');
      type = await chartSwitcher.getVisibleText();
      expect(type).to.be('Pie');
    });
  });
}
