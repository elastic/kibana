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

    const assertWorkspaceAspectRatio = async (expectedRatio: number) => {
      const tolerance = 0.05;

      await retry.try(async () => {
        const { width, height } = await PageObjects.lens.getWorkspaceVisContainerDimensions();

        expect(pxToN(width) / pxToN(height)).to.within(
          expectedRatio - tolerance,
          expectedRatio + tolerance
        );
      });
    };

    const VERTICAL_16_9 = 16 / 9;
    const HORIZONTAL_16_9 = 9 / 16;
    const outerWorkspaceDimensions = { width: 690, height: 400 };
    const UNCONSTRAINED = outerWorkspaceDimensions.width / outerWorkspaceDimensions.height;

    it('adjusts dimension for various chart types', async () => {
      /**
       * This list is specifically designed to test dimension transitions.
       *
       * I have attempted to order the vis types to maximize the number of transitions.
       */
      const visTypes: Array<{
        id: string;
        searchText?: string;
        expectedHeight?: string;
        expectedWidth?: string;
        aspectRatio?: number;
      }> = [
        { id: 'lnsDatatable', aspectRatio: UNCONSTRAINED },
        { id: 'line', aspectRatio: VERTICAL_16_9 },
        {
          id: 'bar_horizontal_percentage_stacked',
          searchText: 'bar',
          aspectRatio: HORIZONTAL_16_9,
        },
        { id: 'lnsLegacyMetric', aspectRatio: UNCONSTRAINED },
        { id: 'bar_horizontal_stacked', aspectRatio: HORIZONTAL_16_9 },
        { id: 'donut', aspectRatio: UNCONSTRAINED },
        { id: 'bar', aspectRatio: VERTICAL_16_9 },
        { id: 'mosaic', aspectRatio: UNCONSTRAINED },
        { id: 'bar_percentage_stacked', searchText: 'bar', aspectRatio: VERTICAL_16_9 },
        { id: 'pie', aspectRatio: UNCONSTRAINED },
        { id: 'bar_stacked', aspectRatio: VERTICAL_16_9 },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'area', aspectRatio: VERTICAL_16_9 },
        { id: 'treemap', aspectRatio: UNCONSTRAINED },
        { id: 'area_percentage_stacked', searchText: 'area', aspectRatio: VERTICAL_16_9 },
        { id: 'waffle', aspectRatio: UNCONSTRAINED },
        { id: 'area_stacked', aspectRatio: VERTICAL_16_9 },

        { id: 'bar_horizontal', aspectRatio: HORIZONTAL_16_9 },
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

        if (vis.aspectRatio) {
          await assertWorkspaceAspectRatio(vis.aspectRatio);
        } else {
          await assertWorkspaceDimensions(vis.expectedWidth!, vis.expectedHeight!);
        }
      }
    });

    it('metric dimensions (absolute pixels)', async () => {
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

    it('gauge dimensions (absolute pixels)', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization('horizontalBullet', 'gauge');
      });

      await assertWorkspaceDimensions('600px', '300px');

      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization('verticalBullet', 'gauge');
      });

      // these dimensions are slightly below the requested 300x600
      // that is because the window size isn't large enough to fit the requested dimensions
      // and the chart is forced to shrink.
      //
      // this is a good thing because it makes this a test case for aspect ratio preservation
      // even when specific pixel dimensions are requested.
      await assertWorkspaceDimensions('200px', '400px');
    });

    it('preserves aspect ratio when either dimension is constrained', async () => {
      const changeWindowAndAssertAspectRatio = async (
        width: number,
        height: number,
        expectedRatio: number
      ) => {
        const { width: currentWidth } = await PageObjects.lens.getWorkspaceVisContainerDimensions();

        await browser.setWindowSize(width, height);

        // this is important so that we don't assert against the old dimensions
        await retry.waitFor('workspace width to change', async () => {
          const { width: newWidth } = await PageObjects.lens.getWorkspaceVisContainerDimensions();
          return newWidth !== currentWidth;
        });

        await assertWorkspaceAspectRatio(expectedRatio);
      };

      // this test is designed to make sure the correct aspect ratio is preserved
      // when the window size is constrained in EITHER width or height
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization('bar');
      });

      // plenty of height, constrained width
      await changeWindowAndAssertAspectRatio(1200, 1000, VERTICAL_16_9);

      // plenty of width, constrained height
      await changeWindowAndAssertAspectRatio(2000, 600, VERTICAL_16_9);
    });
  });
}
