/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'visualize',
    'lens',
    'header',
    'maps',
    'timePicker',
    'common',
  ]);
  const from = 'Sep 22, 2015 @ 00:00:00.000';
  const to = 'Sep 22, 2015 @ 04:00:00.000';

  describe('lens visualize geo field tests', () => {
    before(async () => {
      await PageObjects.common.setTime({ from, to });
    });

    after(async () => {
      await PageObjects.common.unsetTime();
    });

    it('should visualize geo fields in maps', async () => {
      // as navigation does not happen via URL refresh by default, force a reset via URL navigation
      await PageObjects.visualize.navigateToNewVisualization({ forceRefresh: true });
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchDataPanelIndexPattern('logstash-*');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.lens.dragFieldToGeoFieldWorkspace('geo.coordinates');

      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.maps.waitForLayersToLoad();
      const doesLayerExist = await PageObjects.maps.doesLayerExist('logstash-*');
      expect(doesLayerExist).to.equal(true);
      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('logstash-*');
      expect(tooltipText).to.equal(
        'logstash-*\nFound 66 documents.\nResults narrowed by global time'
      );
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
    });
  });
}
