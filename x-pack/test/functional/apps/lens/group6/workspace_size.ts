/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GaugeShapes } from '@kbn/visualizations-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/176882
  describe.skip('lens workspace size', () => {
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

      await retry.tryForTime(2000, async () => {
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

    const assertWorkspaceStyles = async (expectedStyles: {
      aspectRatio: string;
      minHeight: string;
      minWidth: string;
      maxHeight: string;
      maxWidth: string;
    }) => {
      const actualStyles = await PageObjects.lens.getWorkspaceVisContainerStyles();

      expect(actualStyles).to.eql(expectedStyles);
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

      await assertWorkspaceDimensions('400px', '400px');
    });

    it('gauge size (absolute pixels) - horizontal', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization(GaugeShapes.HORIZONTAL_BULLET, 'horizontal');
      });

      await assertWorkspaceDimensions('600px', '200px');
    });

    it('gauge size (absolute pixels) - vertical', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization(GaugeShapes.VERTICAL_BULLET, 'vertical');
      });

      // this height is below the requested 600px
      // that is because the window size isn't large enough to fit the requested dimensions
      // and the chart is forced to shrink.
      //
      // this is a good thing because it makes this a test case for that scenario
      await assertWorkspaceDimensions('400px', '400px');
    });

    it('gauge size (absolute pixels) - arc', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization(GaugeShapes.SEMI_CIRCLE, 'semi');
      });
      await assertWorkspaceDimensions('600px', '375px');
    });

    it('gauge size (absolute pixels) - major arc', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization(GaugeShapes.ARC, 'arc');
      });
      await assertWorkspaceDimensions('600px', '400px');
    });

    it('gauge size (absolute pixels) - circle', async () => {
      await retry.try(async () => {
        await PageObjects.lens.switchToVisualization(GaugeShapes.CIRCLE, 'circular');
      });
      await assertWorkspaceDimensions('600px', '400px');
    });

    it('XY chart size', async () => {
      // XY charts should have 100% width and 100% height unless they are a vertical chart with a time dimension
      await retry.try(async () => {
        // not important that this is specifically a line chart
        await PageObjects.lens.switchToVisualization('line');
      });

      await assertWorkspaceStyles({
        aspectRatio: 'auto',
        minHeight: 'auto',
        minWidth: 'auto',
        maxHeight: '100%',
        maxWidth: '100%',
      });

      await PageObjects.lens.configureDimension({
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
        await PageObjects.lens.switchToVisualization('bar_horizontal_stacked');
      });

      await assertWorkspaceAspectRatio(UNCONSTRAINED);
    });
  });
}
