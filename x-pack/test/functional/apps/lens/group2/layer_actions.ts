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
  const retry = getService('retry');

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

    it('should expose the ignore global filters control for a data layer', async () => {
      await PageObjects.lens.openLayerContextMenu();
      expect(
        await testSubjects.exists('lns-layerPanel-0 > lnsChangeIndexPatternIgnoringFilters')
      ).to.be(false);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      // annotations settings have only ignore filters
      await testSubjects.click('lns-layerSettings-ignoreGlobalFilters');
      expect(
        await testSubjects.exists('lns-layerPanel-0 > lnsChangeIndexPatternIgnoringFilters')
      ).to.be(true);
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
    });

    it('should add an annotation layer and settings shoud be available with ignore filters', async () => {
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

      expect(
        await testSubjects.exists('lns-layerPanel-1 > lnsChangeIndexPatternIgnoringFilters')
      ).to.be(true);

      await PageObjects.lens.openLayerContextMenu(1);
      await testSubjects.click('lnsLayerSettings');
      // annotations settings have only ignore filters
      await testSubjects.click('lns-layerSettings-ignoreGlobalFilters');
      // now close the panel and check the dataView picker has no icon
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
      expect(
        await testSubjects.exists('lns-layerPanel-1 > lnsChangeIndexPatternIgnoringFilters')
      ).to.be(false);
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
        keepOpen: true, // keep it open as the toast will cover the close button anyway
      });

      // close the toast about disabling sampling
      // note: this has also the side effect to close the dimension editor
      await testSubjects.click('toastCloseButton');

      // check that sampling info is hidden as disabled now the dataView picker
      await testSubjects.missingOrFail('lns-layerPanel-2 > lnsChangeIndexPatternSamplingInfo');
      // open the layer settings and check that the slider is disabled
      await PageObjects.lens.openLayerContextMenu(2);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      expect(
        await testSubjects.getAttribute('lns-indexPattern-random-sampling-slider', 'disabled')
      ).to.be('true');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
    });

    it('should expose sampling and ignore filters settings for reference lines layer', async () => {
      await PageObjects.lens.createLayer('referenceLine');

      await PageObjects.lens.openLayerContextMenu(3);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      // random sampling available
      await testSubjects.existOrFail('lns-indexPattern-random-sampling-row');
      // tweak the value
      await PageObjects.lens.dragRangeInput('lns-indexPattern-random-sampling-slider', 2, 'left');
      // annotations settings have only ignore filters
      await testSubjects.click('lns-layerSettings-ignoreGlobalFilters');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');
      // Check both sampling and ignore filters are now present
      await testSubjects.existOrFail('lnsChangeIndexPatternSamplingInfo');
      expect(
        await testSubjects.getVisibleText('lns-layerPanel-3 > lnsChangeIndexPatternSamplingInfo')
      ).to.be('1%');
      expect(
        await testSubjects.exists('lns-layerPanel-3 > lnsChangeIndexPatternIgnoringFilters')
      ).to.be(true);
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

    it('should show visualization modifiers for layer settings when embedded in a dashboard', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      // click on open layer settings
      await PageObjects.lens.openLayerContextMenu();
      await testSubjects.click('lnsLayerSettings');
      // tweak the value
      await PageObjects.lens.dragRangeInput('lns-indexPattern-random-sampling-slider', 2, 'left');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');

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

      // add another layer with a different sampling rate
      await PageObjects.lens.createLayer('data');

      await PageObjects.lens.openLayerContextMenu(1);
      // click on open layer settings
      await testSubjects.click('lnsLayerSettings');
      // tweak the value
      await PageObjects.lens.dragRangeInput('lns-indexPattern-random-sampling-slider', 3, 'left');
      await testSubjects.click('lns-indexPattern-dimensionContainerBack');

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      // add annotation layer
      // by default annotations ignore global filters
      await PageObjects.lens.createLayer('annotations');

      await testSubjects.click('lns-layerPanel-2 > lnsXY_xAnnotationsPanel > lns-dimensionTrigger');

      await testSubjects.click('lnsXY_annotation_query');

      await retry.try(async () => {
        if (!(await testSubjects.exists('annotation-query-based-query-input'))) {
          await testSubjects.setValue('annotation-query-based-query-input', '*', {
            clearWithKeyboard: true,
            typeCharByChar: true,
          });
        }
      });

      await PageObjects.lens.closeDimensionEditor();

      await PageObjects.lens.save('sampledVisualization', false, true, false, 'new');

      // now check for the bottom-left badge
      await testSubjects.existOrFail('lns-feature-badges-trigger');

      // click on the badge and check the popover
      await testSubjects.click('lns-feature-badges-trigger');
      expect(
        (await testSubjects.getVisibleText('lns-feature-badges-reducedSampling-0')).split('\n')
      ).to.contain('1%');
      expect(
        (await testSubjects.getVisibleText('lns-feature-badges-reducedSampling-1')).split('\n')
      ).to.contain('0.1%');
      expect(
        (await testSubjects.getVisibleText('lns-feature-badges-ignoreGlobalFilters-0')).split('\n')
      ).to.contain('Annotations');
    });
  });
}
