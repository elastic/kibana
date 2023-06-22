/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'visualize', 'lens', 'maps', 'timePicker']);

  describe('tile_map visualization', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('visualize');
      await PageObjects.visualize.loadSavedVisualization('Visualization TileMap', {
        navigateToVisualize: false,
      });
      await PageObjects.timePicker.setAbsoluteRange(
        PageObjects.timePicker.defaultStartTime,
        PageObjects.timePicker.defaultEndTime
      );
      await PageObjects.maps.waitForLayersToLoad();
    });

    it('should render tile_map with map embeddable', async () => {
      await PageObjects.maps.openLegend();
      await PageObjects.maps.waitForLayersToLoad();

      expect(await PageObjects.maps.getNumberOfLayers()).to.eql(2);
      expect(await PageObjects.maps.doesLayerExist('Visualization TileMap')).to.be(true);
    });
  });
}
