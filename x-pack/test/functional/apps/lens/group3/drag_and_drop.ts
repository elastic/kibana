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

  const listingTable = getService('listingTable');
  const xyChartContainer = 'xyVisChart';

  describe('lens drag and drop tests', () => {
    describe('basic drag and drop', () => {
      it('should construct the basic split xy chart', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.goToTimeRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.lens.dragFieldToWorkspace('@timestamp', xyChartContainer);

        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          '@timestamp'
        );
      });

      it('should allow dropping fields to existing and empty dimension triggers', async () => {
        await PageObjects.lens.switchToVisualization('lnsDatatable');

        await PageObjects.lens.dragFieldToDimensionTrigger(
          'clientip',
          'lnsDatatable_rows > lns-dimensionTrigger'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_rows')).to.eql(
          'Top 3 values of clientip'
        );

        await PageObjects.lens.dragFieldToDimensionTrigger(
          'bytes',
          'lnsDatatable_rows > lns-empty-dimension'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_rows', 1)).to.eql(
          'bytes'
        );
        await PageObjects.lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsDatatable_rows > lns-empty-dimension'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsDatatable_rows', 2)).to.eql(
          'Top 3 values of @message.raw'
        );
      });

      it('should reorder the elements for the table', async () => {
        await PageObjects.lens.reorderDimensions('lnsDatatable_rows', 3, 1);
        await PageObjects.lens.waitForVisualization();
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsDatatable_rows')).to.eql([
          'Top 3 values of @message.raw',
          'Top 3 values of clientip',
          'bytes',
        ]);
      });

      it('should move the column to compatible dimension group', async () => {
        await PageObjects.lens.switchToVisualization('bar');
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          'Top 3 values of @message.raw',
        ]);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of clientip']);

        await PageObjects.lens.dragDimensionToDimension({
          from: 'lns-layerPanel-0 > lnsXY_xDimensionPanel > lns-dimensionTrigger',
          to: 'lns-layerPanel-0 > lnsXY_splitDimensionPanel > lns-dimensionTrigger',
        });

        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql(
          []
        );
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of @message.raw']);
      });

      it('should move the column to non-compatible dimension group', async () => {
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of @message.raw']);

        await PageObjects.lens.dragDimensionToDimension({
          from: 'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        });

        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql([]);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql([]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
        ]);
      });
      it('should duplicate the column when dragging to empty dimension in the same group', async () => {
        await PageObjects.lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        });
        await PageObjects.lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        });
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
          'Count of @message.raw [1]',
          'Count of @message.raw [2]',
        ]);
      });
      it('should move duplicated column to non-compatible dimension group', async () => {
        await PageObjects.lens.dragDimensionToDimension({
          from: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        });
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @message.raw',
          'Count of @message.raw [1]',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          'Top 5 values of @message.raw',
        ]);
      });

      it('Should duplicate and swap elements when dragging over secondary drop targets', async () => {
        await PageObjects.lens.removeLayer();
        await PageObjects.lens.switchToVisualization('bar');
        await PageObjects.lens.dragFieldToWorkspace('@timestamp', xyChartContainer);

        await PageObjects.lens.dragDimensionToExtraDropType(
          'lnsXY_xDimensionPanel > lns-dimensionTrigger',
          'lnsXY_splitDimensionPanel',
          'duplicate',
          xyChartContainer
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
          '@timestamp [1]'
        );
        await PageObjects.lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_yDimensionPanel > lns-dimensionTrigger'
        );
        await PageObjects.lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_yDimensionPanel',
          'swap',
          xyChartContainer
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_yDimensionPanel')).to.eql(
          'Count of @timestamp'
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_splitDimensionPanel')).to.eql(
          'Top 3 values of @message.raw'
        );
      });

      it('should combine breakdown dimension with the horizontal one', async () => {
        await PageObjects.lens.removeLayer();
        await PageObjects.lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await PageObjects.lens.dragFieldToWorkspace('@message.raw', xyChartContainer);

        await PageObjects.lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 1 other'
        );
      });

      it('should combine field to existing horizontal dimension', async () => {
        await PageObjects.lens.removeLayer();
        await PageObjects.lens.dragFieldToWorkspace('clientip', xyChartContainer);

        await PageObjects.lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 1 other'
        );
      });

      it('should combine two multi terms dimensions', async () => {
        await PageObjects.lens.removeLayer();
        await PageObjects.lens.dragFieldToWorkspace('clientip', xyChartContainer);

        await PageObjects.lens.dragFieldToExtraDropType(
          '@message.raw',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );

        await PageObjects.lens.dragFieldToDimensionTrigger(
          '@message.raw',
          'lnsXY_splitDimensionPanel > lns-empty-dimension'
        );
        await PageObjects.lens.dragFieldToExtraDropType(
          'geo.src',
          'lnsXY_splitDimensionPanel',
          'combine',
          xyChartContainer
        );
        await PageObjects.lens.dragDimensionToExtraDropType(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger',
          'lnsXY_xDimensionPanel',
          'combine',
          xyChartContainer
        );

        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          'Top values of clientip + 2 others'
        );
      });
    });

    describe('keyboard drag and drop', () => {
      it('should drop a field to workspace', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.goToTimeRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.lens.dragFieldWithKeyboard('@timestamp');
        expect(await PageObjects.lens.getDimensionTriggerText('lnsXY_xDimensionPanel')).to.eql(
          '@timestamp'
        );
        await PageObjects.lens.assertFocusedField('@timestamp');
      });
      it('should drop a field to empty dimension', async () => {
        await PageObjects.lens.dragFieldWithKeyboard('bytes', 4);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Median of bytes',
        ]);
        await PageObjects.lens.dragFieldWithKeyboard('@message.raw', 1, true);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of @message.raw']);
        await PageObjects.lens.assertFocusedField('@message.raw');
      });
      it('should drop a field to an existing dimension replacing the old one', async () => {
        await PageObjects.lens.dragFieldWithKeyboard('clientip', 1, true);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of clientip']);

        await PageObjects.lens.assertFocusedField('clientip');
      });
      it('should duplicate an element in a group', async () => {
        await PageObjects.lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 0, 1);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Median of bytes',
          'Count of records [1]',
        ]);

        await PageObjects.lens.assertFocusedDimension('Count of records [1]');
      });

      it('should move dimension to compatible dimension', async () => {
        await PageObjects.lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 5);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql(
          []
        );
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['@timestamp']);

        await PageObjects.lens.dimensionKeyboardDragDrop('lnsXY_splitDimensionPanel', 0, 5, true);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          '@timestamp',
        ]);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql([]);
        await PageObjects.lens.assertFocusedDimension('@timestamp');
      });
      it('should move dimension to incompatible dimension', async () => {
        await PageObjects.lens.dimensionKeyboardDragDrop('lnsXY_yDimensionPanel', 1, 2);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['bytes']);

        await PageObjects.lens.dimensionKeyboardDragDrop('lnsXY_xDimensionPanel', 0, 2);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of records',
          'Count of @timestamp',
        ]);
        await PageObjects.lens.assertFocusedDimension('Count of @timestamp');
      });
      it('should reorder elements with keyboard', async () => {
        await PageObjects.lens.dimensionKeyboardReorder('lnsXY_yDimensionPanel', 0, 1);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_yDimensionPanel')).to.eql([
          'Count of @timestamp',
          'Count of records',
        ]);
        await PageObjects.lens.assertFocusedDimension('Count of records');
      });
    });

    describe('workspace drop', () => {
      it('should always nest time dimension in categorical dimension', async () => {
        await PageObjects.visualize.navigateToNewVisualization();
        await PageObjects.visualize.clickVisType('lens');
        await PageObjects.lens.goToTimeRange();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.lens.dragFieldToWorkspace('@timestamp', xyChartContainer);
        await PageObjects.lens.waitForVisualization(xyChartContainer);
        await PageObjects.lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await PageObjects.lens.waitForVisualization(xyChartContainer);
        expect(
          await PageObjects.lens.getDimensionTriggersTexts('lnsXY_splitDimensionPanel')
        ).to.eql(['Top 3 values of clientip']);
        await PageObjects.lens.openDimensionEditor(
          'lnsXY_splitDimensionPanel > lns-dimensionTrigger'
        );
        expect(await PageObjects.lens.isTopLevelAggregation()).to.be(true);
        await PageObjects.lens.closeDimensionEditor();
      });

      it('overwrite existing time dimension if one exists already', async () => {
        await PageObjects.lens.searchField('utc');
        await PageObjects.lens.dragFieldToWorkspace('utc_time', xyChartContainer);
        await PageObjects.lens.waitForVisualization(xyChartContainer);
        await PageObjects.lens.searchField('client');
        await PageObjects.lens.dragFieldToWorkspace('clientip', xyChartContainer);
        await PageObjects.lens.waitForVisualization(xyChartContainer);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lnsXY_xDimensionPanel')).to.eql([
          'utc_time',
        ]);
      });
    });

    describe('dropping between layers', () => {
      it('should move the column', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsXYvis');
        await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
        await PageObjects.lens.goToTimeRange();

        await PageObjects.lens.createLayer('data');

        await PageObjects.lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_xDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_xDimensionPanel',
          'duplicate',
          xyChartContainer
        );

        await PageObjects.lens.assertFocusedDimension('@timestamp [1]');

        await PageObjects.lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_yDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_yDimensionPanel',
          'duplicate',
          xyChartContainer
        );

        await PageObjects.lens.assertFocusedDimension('Average of bytes [1]');
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Top values of ip',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'Average of bytes [1]',
        ]);
      });

      it('should move formula to empty dimension', async () => {
        await PageObjects.lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          operation: 'formula',
          formula: `moving_average(average(bytes), window=5`,
        });
        await PageObjects.lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_yDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_yDimensionPanel',
          'duplicate',
          xyChartContainer
        );

        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'moving_average(average(bytes), window=5)',
          'Top 3 values of ip',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'moving_average(average(bytes), window=5) [1]',
        ]);
      });

      it('should replace formula with another formula', async () => {
        await PageObjects.lens.configureDimension({
          dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
          operation: 'formula',
          formula: `sum(bytes) + 5`,
        });
        await PageObjects.lens.dragDimensionToDimension({
          from: 'lns-layerPanel-0 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
          to: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-dimensionTrigger',
        });
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Top 3 values of ip',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          '@timestamp [1]',
          'moving_average(average(bytes), window=5)',
        ]);
      });
      it('swaps dimensions', async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await listingTable.searchForItemWithName('lnsXYvis');
        await PageObjects.lens.clickVisualizeListItemTitle('lnsXYvis');
        await PageObjects.lens.goToTimeRange();

        await PageObjects.lens.createLayer('data');
        await PageObjects.lens.dragFieldToDimensionTrigger(
          'bytes',
          'lns-layerPanel-0 > lnsXY_yDimensionPanel > lns-empty-dimension'
        );
        await PageObjects.lens.dragFieldToDimensionTrigger(
          'bytes',
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel > lns-empty-dimension'
        );

        await PageObjects.lens.dragDimensionToExtraDropType(
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-0 > lnsXY_splitDimensionPanel',
          'swap',
          xyChartContainer
        );

        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Median of bytes',
          'bytes',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          'Top 3 values of ip',
        ]);
      });
      it('can combine dimensions', async () => {
        await PageObjects.lens.dragDimensionToExtraDropType(
          'lns-layerPanel-0 > lnsXY_splitDimensionPanel  > lns-dimensionTrigger',
          'lns-layerPanel-1 > lnsXY_splitDimensionPanel',
          'combine',
          xyChartContainer
        );

        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-0')).to.eql([
          '@timestamp',
          'Average of bytes',
          'Median of bytes',
        ]);
        expect(await PageObjects.lens.getDimensionTriggersTexts('lns-layerPanel-1')).to.eql([
          'Top values of ip + 1 other',
        ]);
      });
    });
  });
}
