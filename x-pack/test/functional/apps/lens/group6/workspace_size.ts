/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  function within(actualSize: number, expectedSize: number) {
    const tolerance = 50; // 50 px tolerance
    return actualSize > expectedSize - tolerance && actualSize < expectedSize + tolerance;
  }

  describe('lens workspace size', () => {
    let originalWindowSize: {
      height: number;
      width: number;
      x: number;
      y: number;
    };

    const DEFAULT_WINDOW_SIZE = [1400, 900];
    const VERTICAL_16_9 = 16 / 9;
    const outerWorkspaceDimensions = { width: 704, height: 410 };
    let UNCONSTRAINED = outerWorkspaceDimensions.width / outerWorkspaceDimensions.height;

    before(async () => {
      originalWindowSize = await browser.getWindowSize();
      log.debug(
        `Changing browser window size to ${DEFAULT_WINDOW_SIZE[0]}x${DEFAULT_WINDOW_SIZE[1]}`
      );
      await browser.setWindowSize(DEFAULT_WINDOW_SIZE[0], DEFAULT_WINDOW_SIZE[1]);
      const { width, height } = await browser.getWindowSize();
      log.debug(`Current browser window size set to ${width}x${height}`);

      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');
      // Detect here if the Chrome bug is present, and adjust the aspect ratio accordingly if not
      if (!within(width, DEFAULT_WINDOW_SIZE[0]) || !within(height, DEFAULT_WINDOW_SIZE[1])) {
        const { width: containerWidth, height: containerHeight } =
          await lens.getWorkspaceVisContainerDimensions();

        const newRatio = pxToN(containerWidth) / pxToN(containerHeight);
        log.debug(
          `Detected Chrome bug () adjusting aspect ratio from ${UNCONSTRAINED} to ${newRatio}`
        );
        UNCONSTRAINED = newRatio;
      }

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    after(async () => {
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    const pxToN = (pixels: string) => Number(pixels.substring(0, pixels.length - 2));

    /**
     * Due to https://github.com/elastic/kibana/issues/176882 Chrome doesn't respect
     * the view dimensions passed via the selenium driver. This means that we cannot
     * rely on precise numbers here in the CI, so the best we can do is to check 2 things:
     * 1. The size passed are the upper bound for the given visualization
     * 2. If the view size is correctly set use it to test, otherwise use a lower value based on the
     *    current workspace size
     * @param expectedMaxWidth
     * @param expectedMaxHeight
     */
    const assertWorkspaceDimensions = async (
      expectedMaxWidth: string,
      expectedMaxHeight: string
    ) => {
      const tolerance = 1;

      await retry.tryForTime(2000, async () => {
        const { width, height } = await lens.getWorkspaceVisContainerDimensions();
        log.debug(
          `Checking workspace dimensions: ${width} x ${height} against ${expectedMaxWidth}x${expectedMaxHeight}`
        );

        // Make sure size didn't go past the max passed
        expect(pxToN(width)).to.be.below(pxToN(expectedMaxWidth) + 1);
        expect(pxToN(height)).to.be.below(pxToN(expectedMaxHeight) + 1);

        // now workout the correct size to test
        const widthToTest = pxToN(width) > pxToN(expectedMaxWidth) ? expectedMaxWidth : width;
        const heightToTest = pxToN(height) > pxToN(expectedMaxHeight) ? expectedMaxHeight : height;

        expect(pxToN(width)).to.within(
          pxToN(widthToTest) - tolerance,
          pxToN(widthToTest) + tolerance
        );
        expect(pxToN(height)).to.within(
          pxToN(heightToTest) - tolerance,
          pxToN(heightToTest) + tolerance
        );
      });
    };

    const assertWorkspaceAspectRatio = async (expectedRatio: number) => {
      const tolerance = 0.07;

      await retry.try(async () => {
        const { width, height } = await lens.getWorkspaceVisContainerDimensions();
        log.debug(
          `Checking workspace dimensions: ${pxToN(width)} x ${pxToN(height)} with ratio ${
            pxToN(width) / pxToN(height)
          } vs ${expectedRatio}`
        );

        expect(pxToN(width) / pxToN(height)).to.within(
          expectedRatio - tolerance,
          expectedRatio + tolerance
        );
      });
    };

    const assertWorkspaceStyles = async (expectedStyles: {
      aspectRatio: string;
      minHeight: string;
      minWidth: string;
      maxHeight: string;
      maxWidth: string;
    }) => {
      const actualStyles = await lens.getWorkspaceVisContainerStyles();

      expect(actualStyles).to.eql(expectedStyles);
    };

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
          await lens.switchToVisualization(vis.id, vis.searchText);
        });

        log.debug(
          `Testing ${vis.id}... expecting ${
            vis.aspectRatio
              ? `ratio of ${vis.aspectRatio}`
              : `${vis.expectedWidth}x${vis.expectedHeight}`
          }`
        );

        if (vis.aspectRatio) {
          await assertWorkspaceAspectRatio(vis.aspectRatio);
        } else {
          await assertWorkspaceDimensions(vis.expectedWidth!, vis.expectedHeight!);
        }
      }
    });

    it('metric size (absolute pixels)', async () => {
      await retry.try(async () => {
        await lens.switchToVisualization('lnsMetric');
      });

      await assertWorkspaceDimensions('300px', '300px');

      await lens.configureDimension({
        dimension: 'lnsMetric_breakdownByDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await assertWorkspaceDimensions('600px', '430px');

      await lens.openDimensionEditor('lnsMetric_breakdownByDimensionPanel');
      await testSubjects.setValue('lnsMetric_max_cols', '2');
      await lens.closeDimensionEditor();

      await assertWorkspaceDimensions('430px', '430px');
    });

    it('gauge size (absolute pixels) - horizontal', async () => {
      await retry.try(async () => {
        await lens.switchToVisualization('lnsGauge', 'gauge');
        await lens.waitForVisualization('gaugeChart');
      });

      await assertWorkspaceDimensions('600px', '200px');
    });

    it('gauge size (absolute pixels) - vertical', async () => {
      await lens.openVisualOptions();
      await testSubjects.click('lns_gaugeOrientation_verticalBullet');

      // this height is below the requested 600px
      // that is because the window size isn't large enough to fit the requested dimensions
      // and the chart is forced to shrink.
      //
      // this is a good thing because it makes this a test case for that scenario
      await assertWorkspaceDimensions('430px', '430px');
    });

    it('gauge size (absolute pixels) - arc', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Minor arc');
      await assertWorkspaceDimensions('600px', '375px');
    });

    it('gauge size (absolute pixels) - major arc', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Major arc');
      await assertWorkspaceDimensions('600px', '430px');
    });

    it('gauge size (absolute pixels) - circle', async () => {
      await lens.openVisualOptions();
      await lens.setGaugeShape('Circle');
      await assertWorkspaceDimensions('600px', '430px');
    });

    it('XY chart size', async () => {
      // XY charts should have 100% width and 100% height unless they are a vertical chart with a time dimension
      await retry.try(async () => {
        // not important that this is specifically a line chart
        await lens.switchToVisualization('line');
      });

      await assertWorkspaceStyles({
        aspectRatio: 'auto',
        minHeight: 'auto',
        minWidth: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await assertWorkspaceStyles({
        aspectRatio: '16 / 9',
        minHeight: '300px',
        minWidth: '100%',
        maxHeight: 'none',
        maxWidth: 'none',
      });

      await assertWorkspaceAspectRatio(VERTICAL_16_9);

      await retry.try(async () => {
        await lens.switchToVisualization('bar');
      });

      await assertWorkspaceAspectRatio(UNCONSTRAINED);
    });
  });
}
