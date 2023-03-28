/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  describe('lens layer actions tests', () => {
    it('should allow creation of lens xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      // check that no sampling info is shown in the dataView picker
      expect(await testSubjects.exists('lnsChangeIndexPatternSamplingInfo')).to.be(false);

      await PageObjects.lens.openLayerContextMenu();

      // should be 3 actions available
      expect(
        (await find.allByCssSelector('[data-test-subj=lnsLayerActionsMenu] button')).length
      ).to.eql(3);
    });

    it('should open layer settings for a data layer and set a sampling rate', async () => {
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      // random sampling available
      await testSubjects.existOrFail('lns-indexPattern-random-sampling-row');
      // tweak the value
      await PageObjects.lens.dragRangeInput('lns-indexPattern-random-sampling-slider', 2, 'left');

      expect(
        await PageObjects.lens.getRangeInputValue('lns-indexPattern-random-sampling-slider')
      ).to.eql(
        3 // 1%
      );
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');

      // now check that the dataView picker has the sampling info
      await testSubjects.existOrFail('lnsChangeIndexPatternSamplingInfo');
      expect(await testSubjects.getVisibleText('lnsChangeIndexPatternSamplingInfo')).to.be('1%');
    });

    it('should add an annotation layer and settings shoud not be available', async () => {
      // configure a date histogram
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      // add annotation layer
      await PageObjects.lens.createLayer('annotations');
      await PageObjects.lens.openLayerContextMenu(1);
      // layer settings not available
      await testSubjects.missingOrFail('lnsLayerSettings');
    });

    it('should add a new visualization layer and disable the sampling if max operation is chosen', async () => {
      await PageObjects.lens.createLayer('data');

      await PageObjects.lens.openLayerContextMenu(2);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      // tweak the value
      await PageObjects.lens.dragRangeInput('lns-indexPattern-random-sampling-slider', 2, 'left');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
      // check the sampling is shown
      await testSubjects.existOrFail('lns-layerPanel-2 > lnsChangeIndexPatternSamplingInfo');
      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-2 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      // now configure a max operation
      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-2 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'max',
        field: 'bytes',
      });

      // check that sampling info is hidden as disabled now the dataView picker
      expect(
        await testSubjects.exists('lns-layerPanel-2 > lnsChangeIndexPatternSamplingInfo')
      ).to.be(false);
      // open the layer settings and check that the slider is disabled
      await PageObjects.lens.openLayerContextMenu(2);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      expect(
        await testSubjects.getAttribute('lns-indexPattern-random-sampling-slider', 'disabled')
      ).to.be('true');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
    });

    it('should switch to pie chart and have layer settings available', async () => {
      await PageObjects.lens.switchToVisualization('pie');
      await PageObjects.lens.openLayerContextMenu();
      // layer settings still available
      // open the panel
      await testSubjects.click('lnsLayerSettings');
      // check the sampling value
      expect(
        await PageObjects.lens.getRangeInputValue('lns-indexPattern-random-sampling-slider')
      ).to.eql(
        3 // 1%
      );
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
    });

    it('should switch to table and still have layer settings', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');
      await PageObjects.lens.openLayerContextMenu();
      // layer settings still available
      // open the panel
      await testSubjects.click('lnsLayerSettings');
      // check the sampling value
      expect(
        await PageObjects.lens.getRangeInputValue('lns-indexPattern-random-sampling-slider')
      ).to.eql(
        3 // 1%
      );
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
    });
  });
}
