/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, visualBuilder, lens, header } = getPageObjects([
    'visualBuilder',
    'visualize',
    'header',
    'lens',
  ]);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const filterBar = getService('filterBar');
  const queryBar = getService('queryBar');

  describe('Time Series', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    it('should show the "Edit Visualization in Lens" menu item for a count aggregation', async () => {
      await visualize.navigateToNewVisualization();
      await visualize.clickVisualBuilder();
      await visualBuilder.checkVisualBuilderIsPresent();
      await visualBuilder.resetPage();
      const isMenuItemVisible = await find.existsByCssSelector(
        '[data-test-subj="visualizeEditInLensButton"]'
      );
      expect(isMenuItemVisible).to.be(true);
    });

    it('visualizes field to Lens and loads fields to the dimesion editor', async () => {
      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('xyVisChart');
      await retry.try(async () => {
        const dimensions = await testSubjects.findAll('lns-dimensionTrigger');
        expect(dimensions).to.have.length(2);
        expect(await dimensions[0].getVisibleText()).to.be('@timestamp');
        expect(await dimensions[1].getVisibleText()).to.be('Count of records');
      });
    });

    it('navigates back to TSVB when the Back button is clicked', async () => {
      const goBackBtn = await testSubjects.find('lnsApp_goBackToAppButton');
      goBackBtn.click();
      await visualBuilder.checkVisualBuilderIsPresent();
      await retry.try(async () => {
        const actualCount = await visualBuilder.getRhythmChartLegendValue();
        expect(actualCount).to.be('56');
      });
    });

    it('should preserve app filters in lens', async () => {
      await filterBar.addFilter('extension', 'is', 'css');
      await header.waitUntilLoadingHasFinished();
      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('xyVisChart');

      expect(await filterBar.hasFilter('extension', 'css')).to.be(true);
    });

    it('should preserve query in lens', async () => {
      const goBackBtn = await testSubjects.find('lnsApp_goBackToAppButton');
      goBackBtn.click();
      await visualBuilder.checkVisualBuilderIsPresent();
      await queryBar.setQuery('machine.os : ios');
      await queryBar.submitQuery();
      await header.waitUntilLoadingHasFinished();
      const button = await testSubjects.find('visualizeEditInLensButton');
      await button.click();
      await lens.waitForVisualization('xyVisChart');

      expect(await queryBar.getQueryString()).to.equal('machine.os : ios');
    });
  });
}
