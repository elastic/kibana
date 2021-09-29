/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe('lens thresholds tests', () => {
    it('should show a disabled threshold layer button if no data dimension is defined', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');

      await testSubjects.click('lnsLayerAddButton');
      await retry.waitFor('wait for layer popup to appear', async () =>
        testSubjects.exists(`lnsLayerAddButton-threshold`)
      );
      expect(
        await (await testSubjects.find(`lnsLayerAddButton-threshold`)).getAttribute('disabled')
      ).to.be('true');
    });

    it('should add a threshold layer with a static value in it', async () => {
      await PageObjects.lens.goToTimeRange();

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

      await PageObjects.lens.createLayer('threshold');

      expect((await find.allByCssSelector(`[data-test-subj^="lns-layerPanel-"]`)).length).to.eql(2);
      expect(
        await (
          await testSubjects.find('lnsXY_yThresholdLeftPanel > lns-dimensionTrigger')
        ).getVisibleText()
      ).to.eql('Static value: 4992.44');
    });

    it('should create a dynamic threshold when dragging a field to a threshold dimension group', async () => {
      await PageObjects.lens.dragFieldToDimensionTrigger(
        'bytes',
        'lnsXY_yThresholdLeftPanel > lns-empty-dimension'
      );

      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yThresholdLeftPanel')).to.eql([
        'Static value: 4992.44',
        'Median of bytes',
      ]);
    });

    it('should add a new group to the threshold layer when a right axis is enabled', async () => {
      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
        keepOpen: true,
      });

      await PageObjects.lens.changeAxisSide('right');

      await PageObjects.lens.closeDimensionEditor();

      await testSubjects.existOrFail('lnsXY_yThresholdRightPanel > lns-empty-dimension');
    });

    it('should carry the style when moving a threshold to another group', async () => {
      // style it enabling the fill
      await testSubjects.click('lnsXY_yThresholdLeftPanel > lns-dimensionTrigger');
      await testSubjects.click('lnsXY_fill_below');
      await PageObjects.lens.closeDimensionEditor();

      // drag and drop it to the left axis
      await PageObjects.lens.dragDimensionToDimension(
        'lnsXY_yThresholdLeftPanel > lns-dimensionTrigger',
        'lnsXY_yThresholdRightPanel > lns-empty-dimension'
      );

      await testSubjects.click('lnsXY_yThresholdRightPanel > lns-dimensionTrigger');
      expect(
        await find.existsByCssSelector('[data-test-subj="lnsXY_fill_below"][class$="isSelected"]')
      ).to.be(true);
      await PageObjects.lens.closeDimensionEditor();
    });

    it('should duplicate also the original style when duplicating a threshold', async () => {
      // drag and drop to the empty field to generate a duplicate
      await PageObjects.lens.dragDimensionToDimension(
        'lnsXY_yThresholdRightPanel > lns-dimensionTrigger',
        'lnsXY_yThresholdRightPanel > lns-empty-dimension'
      );

      await (
        await find.byCssSelector(
          '[data-test-subj="lnsXY_yThresholdRightPanel"]:nth-child(2) [data-test-subj="lns-dimensionTrigger"]'
        )
      ).click();
      expect(
        await find.existsByCssSelector('[data-test-subj="lnsXY_fill_below"][class$="isSelected"]')
      ).to.be(true);
      await PageObjects.lens.closeDimensionEditor();
    });
  });
}
