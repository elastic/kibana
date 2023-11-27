/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const visTypes = [
  {
    id: 'bar',
    searchText: '',
    expectedWidth: '506px',
    expectedHeight: '284.625px',
  },
  {
    id: 'bar_horizontal',
    searchText: '',
    expectedWidth: '265.5px',
    expectedHeight: '472px',
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'common']);
  const browser = getService('browser');

  describe('lens workspace dimensions', () => {
    let originalWindowSize: {
      height: number;
      width: number;
      x: number;
      y: number;
    };

    before(async () => {
      originalWindowSize = await browser.getWindowSize();
      await browser.setWindowSize(1200, 1000);

      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.goToTimeRange();

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await PageObjects.lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
    });

    after(async () => {
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    it('adjusts dimension for various vis types', async () => {
      while (visTypes.length) {
        const vis = visTypes.pop()!;
        await PageObjects.lens.switchToVisualization(vis.id, vis.searchText);

        const { width, height } = await PageObjects.lens.getWorkspaceVisContainerDimensions();

        expect(width).to.be(vis.expectedWidth);
        expect(height).to.be(vis.expectedHeight);
      }
    });
  });
}
