/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common', 'header']);

  describe('lens drag and drop tests', () => {
    it('should construct the basic split xy chart', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.dragFieldToWorkspace('@timestamp');

      expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
        '@timestamp'
      );
    });

    it('should allow dropping fields to existing and empty dimension triggers', async () => {
      await PageObjects.lens.switchToVisualization('lnsDatatable');

      await PageObjects.lens.dragFieldToDimensionTrigger(
        'clientip',
        'lnsDatatable_column > lns-dimensionTrigger'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_column')).to.eql(
        'Top values of clientip'
      );

      await PageObjects.lens.dragFieldToDimensionTrigger(
        'bytes',
        'lnsDatatable_column > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_column', 1)).to.eql(
        'bytes'
      );
      await PageObjects.lens.dragFieldToDimensionTrigger(
        '@message.raw',
        'lnsDatatable_column > lns-empty-dimension'
      );
      expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_column', 2)).to.eql(
        'Top values of @message.raw'
      );
    });

    it('should reorder the elements for the table', async () => {
      await PageObjects.lens.reorderDimensions('lnsDatatable_column', 2, 0);
      await PageObjects.header.waitUntilLoadingHasFinished();
      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsDatatable_column')).to.eql([
        'Top values of @message.raw',
        'Top values of clientip',
        'bytes',
      ]);
    });

    it('should move the column to compatible dimension group', async () => {
      await PageObjects.lens.switchToVisualization('bar');
      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
        'Top values of @message.raw',
      ]);
      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
        'Top values of clientip',
      ]);

      await PageObjects.lens.dragDimensionToDimension(
        'lnsXY_xDimensionPanel > lns-dimensionTrigger',
        'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
      );

      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([]);
      expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
        'Top values of @message.raw',
      ]);
    });
  });
}
