/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens, header } = getPageObjects(['visualize', 'lens', 'header']);

  const listingTable = getService('listingTable');
  const xyChartContainer = 'xyVisChart';

  describe('lens drag and drop tests', () => {
    describe('basic drag and drop', () => {
      it('should construct a bar chart when dropping a field to create top values chart', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await header.waitUntilLoadingHasFinished();
        await lens.dragFieldToWorkspace('machine.os.raw', xyChartContainer);
        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top 5 values of machine.os.raw'
        );
        expect(await lens.getChartTypeFromChartSwitcher()).to.eql('Bar');
      });
      it('should construct a bar chart when dropping a time field to create a date histogram chart', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await header.waitUntilLoadingHasFinished();
        await lens.dragFieldToWorkspace('@timestamp', xyChartContainer);
        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql('@timestamp');
        expect(await lens.getChartTypeFromChartSwitcher()).to.eql('Bar');
      });

      it('should allow dropping fields to existing and empty dimension triggers', async () => {
        await lens.switchToVisualization('lnsDatatable');

        await lens.dragFieldToDimensionTrigger(
          'clientip',
          'lnsDatatable_rows > lns-dimensionTrigger'
        );
        expect(await lens.getDimensionTriggerText('lnsDatatable_rows')).to.eql(
          'Top 3 values of clientip'
        );

        await lens.dragFieldToDimensionTrigger('bytes', 'lnsDatatable_rows > lns-empty-dimension');
        expect(await lens.getDimensionTriggerText('lnsDatatable_rows', 1)).to.eql('bytes');
        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsDatatable_rows > lns-empty-dimension'
        );
        expect(await lens.getDimensionTriggerText('lnsDatatable_rows', 2)).to.eql(
          'Top 3 values of @message.raw'
        );
      });

      it('should reorder the elements for the table', async () => {
        await lens.reorderDimensions('lnsDatatable_rows', 3, 1);
        await lens.waitForVisualization();
        expect(await lens.getDimensionTriggersTexts('lnsDatatable_rows')).to.eql([
          'Top 3 values of @message.raw',
          'Top 3 values of clientip',
          'bytes',
        ]);
      });

      it('should move the column to compatible dimension group', async () => {
        await lens.switchToVisualization('bar');
        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          'Top 3 values of @message.raw',
        ]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of clientip',
        ]);

        await lens.dragDimensionToDimension({
          from: 'lns-layerPanel-0 > lnsXY_xDimensionPanel > lns-dimensionTrigger',
          to: 'lns-layerPanel-0 > lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        });

        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of @message.raw',
        ]);
      });

      it('should move the column to non-compatible dimension group', async () => {
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of @message.raw',
        ]);

        await lens.dragDimensionToDimension({
          from: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        });

        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
        ]);
      });
      it('should duplicate the column when dragging to empty dimension in the same group', async () => {
        await lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        });
        await lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        });
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
          'Count of @message.raw [1]',
          'Count of @message.raw [2]',
        ]);
      });
      it('should move duplicated column to non-compatible dimension group', async () => {
        await lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        });
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
          'Count of @message.raw [1]',
        ]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          'Top 5 values of @message.raw',
        ]);
      });

      it('Should duplicate and swap elements when dragging over secondary drop targets', async () => {
        await lens.removeLayer();
        await lens.switchToVisualization('bar');
        await lens.dragFieldToWorkspace('@timestamp', xyChartContainer);

        await lens.dragDimensionToExtraDropType(
          'lnsXY_xDimensionPanel > lns-dimensionTrigger',
          'lnsXY_splitDimensionPanel',
          'duplicate',
          xyChartContainer
        );
        expect(await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
          '@timestamp [1]'
        );
        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_yDimensionPanel > lns-dimensionTrigger'
        );
        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_yDimensionPanel',
          'swap',
          xyChartContainer
        );
        expect(await lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
          'Count of @timestamp'
        );
        expect(await lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
          'Top 3 values of @message.raw'
        );
      });

      it('should combine breakdown dimension with the horizontal one', async () => {
        await lens.removeLayer();
        await lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await lens.dragFieldToWorkspace('@message.raw', xyChartContainer);

        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );
        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 1 other'
        );
      });

      it('should combine field to existing horizontal dimension', async () => {
        await lens.removeLayer();
        await lens.dragFieldToWorkspace('clientip', xyChartContainer);

        await lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );
        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 1 other'
        );
      });

      it('should combine two multi terms dimensions', async () => {
        await lens.removeLayer();
        await lens.dragFieldToWorkspace('clientip', xyChartContainer);

        await lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );

        await lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_splitDimensionPanel > lns-empty-dimension'
        );
        await lens.dragFieldToExtraDropType(
          'geo.src',
          'lnsXY_splitDimensionPanel',
          'combine',
          xyChartContainer
        );
        await lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );

        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 2 others'
        );
      });
    });

    describe('keyboard drag and drop', () => {
      it('should drop a field to workspace', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await header.waitUntilLoadingHasFinished();
        await lens.dragFieldWithKeyboard('@timestamp');
        expect(await lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql('@timestamp');
        await lens.assertFocusedField('@timestamp');
      });
      it('should drop a field to empty dimension', async () => {
        await lens.dragFieldWithKeyboard('bytes', 4);
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Median of bytes',
        ]);
        await lens.dragFieldWithKeyboard('@message.raw', 1, true);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of @message.raw',
        ]);
        await lens.assertFocusedField('@message.raw');
      });
      it('should drop a field to an existing dimension replacing the old one', async () => {
        await lens.dragFieldWithKeyboard('clientip', 1, true);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of clientip',
        ]);

        await lens.assertFocusedField('clientip');
      });
      it('should duplicate an element in a group', async () => {
        await lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 0, 1);
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Median of bytes',
          'Count of records [1]',
        ]);

        await lens.assertFocusedDimension('Count of records [1]');
      });

      it('should move dimension to compatible dimension', async () => {
        await lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 5);
        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          '@timestamp',
        ]);

        await lens.dimensionKeyboardDragDrop('lnsXY_splitDimensionPanel', 0, 5, true);
        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          '@timestamp',
        ]);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([]);
        await lens.assertFocusedDimension('@timestamp');
      });
      it('should move dimension to incompatible dimension', async () => {
        await lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 1, 2);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql(['bytes']);

        await lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 2);
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Count of @timestamp',
        ]);
        await lens.assertFocusedDimension('Count of @timestamp');
      });
      it('should reorder elements with keyboard', async () => {
        await lens.dimensionKeyboardReorder('lnsXY_yDimensionPanel', 0, 1);
        expect(await lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @timestamp',
          'Count of records',
        ]);
        await lens.assertFocusedDimension('Count of records');
      });
    });

    describe('workspace drop', () => {
      it('should always nest time dimension in categorical dimension', async () => {
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        await header.waitUntilLoadingHasFinished();
        await lens.dragFieldToWorkspace('@timestamp', xyChartContainer);
        await lens.waitForVisualization(xyChartContainer);
        await lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await lens.waitForVisualization(xyChartContainer);
        expect(await lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')).to.eql([
          'Top 3 values of clientip',
        ]);
        await lens.openDimensionEditor('lnsXY_splitDimensionPanel > lns-dimensionTrigger');
        expect(await lens.isTopLevelAggregation()).to.be(true);
        await lens.closeDimensionEditor();
      });

      it('overwrite existing time dimension if one exists already', async () => {
        await lens.searchField('utc');
        await lens.dragFieldToWorkspace('utc_time', xyChartContainer);
        await lens.waitForVisualization(xyChartContainer);
        await lens.searchField('client');
        await lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await lens.waitForVisualization(xyChartContainer);
        expect(await lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql(['utc_time']);
      });
    });

    describe('dropping between layers', () => {
      it('should move the column', async () => {
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsXYvis');
        await lens.clickVisualizeListItemTitle('lnsXYvis');

        await lens.createLayer('data');

        // here the editor will error out as the mandatory vertical axis is missing
        await lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_xDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_xDimensionPanel',
          'duplicate',
          'workspace-error-message'
        );

        await lens.assertFocusedDimension('@timestamp [1]');

        await lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_yDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_yDimensionPanel',
          'duplicate',
          xyChartContainer
        );

        await lens.assertFocusedDimension('Average of bytes [1]');
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Top 3 values of ip',
        ]);
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'Average of bytes [1]',
        ]);
      });

      it('should move formula to empty dimension', async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          operation: 'formula',
          formula: `moving_average(average(bytes), window=5`,
        });
        await lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_yDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_yDimensionPanel',
          'duplicate',
          xyChartContainer
        );

        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'moving_average(average(bytes), window=5)',
          'Top 3 values of ip',
        ]);
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'moving_average(average(bytes), window=5) [1]',
        ]);
      });

      it('should replace formula with another formula', async () => {
        await lens.configureDimension({
          dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
          operation: 'formula',
          formula: `sum(bytes) + 5`,
        });
        await lens.dragDimensionToDimension({
          from: 'lns-layerPanel-0 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
        });
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Top 3 values of ip',
        ]);
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'moving_average(average(bytes), window=5)',
        ]);
      });
      it('swaps dimensions', async () => {
        await visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsXYvis');
        await lens.clickVisualizeListItemTitle('lnsXYvis');

        await lens.createLayer('data');
        await lens.dragFieldToDimensionTrigger(
          'bytes',
          'lns-layerPanel-0 > lnsXY_yDimensionPanel > lns-empty-dimension'
        );
        await lens.dragFieldToDimensionTrigger(
          'bytes',
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel > lns-empty-dimension'
        );

        // here the editor will error out as the mandatory vertical axis is missing
        await lens.dragDimensionToExtraDropType(
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-0 > lnsXY_splitDimensionPanel',
          'swap',
          'workspace-error-message'
        );

        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Median of bytes',
          'bytes',
        ]);
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          'Top 3 values of ip',
        ]);
      });
      it('can combine dimensions', async () => {
        // here the editor will error out as the mandatory vertical axis is missing
        await lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_splitDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel',
          'combine',
          'workspace-error-message'
        );

        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Median of bytes',
        ]);
        expect(await lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          'Top values of ip + 1 other',
        ]);
      });
    });
  });
}
