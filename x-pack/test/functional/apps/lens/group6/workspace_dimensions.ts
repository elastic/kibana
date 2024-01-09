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

  describe('lens workspace size', () => {
    let originalWindowSize: {
      height: number;
      width: number;
      x: number;
      y: number;
    };

    const DEFAULT_WINDOW_SIZE = [1400, 900];

    before(async () => {
      originalWindowSize = await browser.getWindowSize();

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    beforeEach(async () => {
      await browser.setWindowSize(DEFAULT_WINDOW_SIZE[0], DEFAULT_WINDOW_SIZE[1]);
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
    const outerWorkspaceDimensions = { width: 690, height: 400 };
    const UNCONSTRAINED = outerWorkspaceDimensions.width / outerWorkspaceDimensions.height;

    it('workspace size recovers from special vis types', async () => {
      /**
       * This list is specifically designed to test dimension transitions.
       *
       * I have attempted to order the vis types to maximize the number of transitions.
       *
       * Excluding XY charts since they are tested separately.
       */
      const visTypes: Array<{
        id: string;
        searchText?: string;
        expectedHeight?: string;
        expectedWidth?: string;
        aspectRatio?: number;
      }> = [
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'lnsDatatable', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'lnsLegacyMetric', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'donut', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'mosaic', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'pie', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'treemap', aspectRatio: UNCONSTRAINED },
        {
          id: 'lnsMetric',
          expectedWidth: '300px',
          expectedHeight: '300px',
        },
        { id: 'waffle', aspectRatio: UNCONSTRAINED },
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

    it('metric size (absolute pixels)', async () => {
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

    it('gauge size (absolute pixels)', async () => {
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

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      // plenty of height, constrained width
      await changeWindowAndAssertAspectRatio(1200, 1000, VERTICAL_16_9);

      // plenty of width, constrained height
      await changeWindowAndAssertAspectRatio(2000, 600, VERTICAL_16_9);

      await PageObjects.lens.removeDimension('lnsXY_xDimensionPanel');
    });

    it('XY chart size', async () => {
      // XY charts should have 100% width and 100% height unless they are a vertical chart with a time dimension
      await retry.try(async () => {
        // not important that this is specifically a line chart
        await PageObjects.lens.switchToVisualization('line');
      });

      await assertWorkspaceAspectRatio(UNCONSTRAINED);

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await assertWorkspaceAspectRatio(VERTICAL_16_9);

      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization('bar_horizontal_stacked');
      });

      await assertWorkspaceAspectRatio(UNCONSTRAINED);
    });
  });
}
