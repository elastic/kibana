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
  });
}
