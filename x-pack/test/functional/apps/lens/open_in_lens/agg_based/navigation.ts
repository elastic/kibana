/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { visualize, lens, timePicker } = getPageObjects(['visualize', 'lens', 'timePicker']);

  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Visualize to Lens and back', function describeIndexTests() {
    before(async () => {
      await visualize.initTests();
    });

    before(async () => {
      await visualize.navigateToNewAggBasedVisualization();
      await visualize.clickLineChart();
      await visualize.clickNewSearch();
      await timePicker.setDefaultAbsoluteRange();
    });

    it('should let the user return back to Visualize if no changes were made', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
      });

      await testSubjects.click('lnsApp_goBackToAppButton');

      // it should be back to visualize now
      await retry.try(async () => {
        expect(await visualize.hasNavigateToLensButton()).to.eql(true);
      });
    });

    it('should let the user return back to Visualize but show a warning modal if changes happened in Lens', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
      });

      // Make a change in Lens
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await testSubjects.click('lnsApp_goBackToAppButton');

      // check that there's a modal
      await retry.try(async () => {
        await testSubjects.existOrFail('lnsApp_discardChangesModalOrigin');
      });
      // click on discard
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        expect(await visualize.hasNavigateToLensButton()).to.eql(true);
      });
    });

    it('should let the user return back to Visualize with no modal if changes have been saved in Lens', async () => {
      await visualize.navigateToLensFromAnotherVisualization();
      await lens.waitForVisualization('xyVisChart');

      await retry.try(async () => {
        expect(await lens.getLayerCount()).to.be(1);
      });

      // Make a change in Lens
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      // save in Lens new changes
      await lens.save('Migrated Viz saved in Lens');

      await testSubjects.click('lnsApp_goBackToAppButton');
      await retry.try(async () => {
        expect(await visualize.hasNavigateToLensButton()).to.eql(true);
      });
    });
  });
}
