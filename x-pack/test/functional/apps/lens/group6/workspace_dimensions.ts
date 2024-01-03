/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  describe('lens workspace dimensions', () => {
    let originalWindowSize: {
      height: number;
      width: number;
      x: number;
      y: number;
    };

    before(async () => {
      originalWindowSize = await browser.getWindowSize();
      await browser.setWindowSize(1400, 900);

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    after(async () => {
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    const pxToN = (pixels: string) => Number(pixels.substring(0, pixels.length - 2));

    const assertWorkspaceDimensions = async (expectedWidth: string, expectedHeight: string) => {
      const tolerance = 1;

      await retry.try(async () => {
        const { width, height } = await PageObjects.lens.getWorkspaceVisContainerDimensions();

        expect(pxToN(width)).to.within(
          pxToN(expectedWidth) - tolerance,
          pxToN(expectedWidth) + tolerance
        );
        expect(pxToN(height)).to.within(
          pxToN(expectedHeight) - tolerance,
          pxToN(expectedHeight) + tolerance
        );
      });
    };

    it('adjusts dimension for various chart types', async () => {
      const VERTICAL_16_9 = { expectedWidth: '690px', expectedHeight: '388.125px' };
      const HORIZONTAL_16_9 = { expectedWidth: '225px', expectedHeight: '400px' };
      const UNCONSTRAINED = { expectedWidth: '690px', expectedHeight: '400px' };

      /**
       * This list is specifically designed to test dimension transitions.
       *
       * I have attempted to order the vis types to maximize the number of transitions.
       */
      const visTypes: Array<{
        expectedWidth: string;
        expectedHeight: string;
        id: string;
        searchText?: string;
      }> = [
        { id: 'lnsDatatable', ...UNCONSTRAINED },
        { id: 'line', ...VERTICAL_16_9 },
        {
          id: 'verticalBullet',
          searchText: 'gauge',
          // these dimensions are slightly below the requested 300x600
          // that is because the window size isn't large enough to fit the requested dimensions
          // and the chart is forced to shrink.
          //
          // this is a good thing because it makes this a test case for aspect ratio preservation
          // even when specific pixel dimensions are requested.
          expectedWidth: '200px',
          expectedHeight: '400px',
        },
        { id: 'bar_horizontal_percentage_stacked', searchText: 'bar', ...HORIZONTAL_16_9 },
        { id: 'lnsLegacyMetric', ...UNCONSTRAINED },
        { id: 'bar_horizontal_stacked', ...HORIZONTAL_16_9 },
        { id: 'donut', ...UNCONSTRAINED },
        { id: 'bar', ...VERTICAL_16_9 },
        { id: 'mosaic', ...UNCONSTRAINED },
        { id: 'bar_percentage_stacked', searchText: 'bar', ...VERTICAL_16_9 },
        { id: 'pie', ...UNCONSTRAINED },
        { id: 'bar_stacked', ...VERTICAL_16_9 },
        { id: 'lnsMetric', expectedWidth: '300px', expectedHeight: '300px' },
        { id: 'area', ...VERTICAL_16_9 },
        { id: 'treemap', ...UNCONSTRAINED },
        { id: 'area_percentage_stacked', searchText: 'area', ...VERTICAL_16_9 },
        { id: 'waffle', ...UNCONSTRAINED },
        { id: 'area_stacked', ...VERTICAL_16_9 },
        {
          id: 'horizontalBullet',
          searchText: 'gauge',
          expectedWidth: '600px',
          expectedHeight: '300px',
        },
        { id: 'bar_horizontal', ...HORIZONTAL_16_9 },
        // { id: 'heatmap', ...UNCONSTRAINED }, // heatmap blocks render unless it's given two dimensions. This stops the expression renderer from requesting new dimensions.
        // { id: 'lnsChoropleth', ...UNCONSTRAINED }, // choropleth currently erases all dimensions
        // { id: 'lnsTagcloud', ...UNCONSTRAINED }, // tag cloud currently erases all dimensions
      ];

      while (visTypes.length) {
        const vis = visTypes.pop()!;
        await retry.try(async () => {
          await PageObjects.lens.switchToVisualization(vis.id, vis.searchText);
        });

        log.debug(`Testing ${vis.id}... expecting ${vis.expectedWidth}x${vis.expectedHeight}`);

        await assertWorkspaceDimensions(vis.expectedWidth, vis.expectedHeight);
      }
    });

    it('metric dimensions', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization('lnsMetric');
      });

      await assertWorkspaceDimensions('300px', '300px');

      await PageObjects.lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await assertWorkspaceDimensions('600px', '400px');

      await PageObjects.lens.openDimensionEditor('lnsMetric_breakdownByDimensionPanel');
      await testSubjects.setValue('lnsMetric_max_cols', '2');

      await assertWorkspaceDimensions('266.664px', '400px');
    });
  });
}
