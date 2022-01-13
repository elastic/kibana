/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['visualize', 'lens', 'header', 'maps', 'timePicker']);

  describe('lens visualize geo field tests', () => {
    it('should visualize geo fields in maps', async () => {
      await PageObjects.visualize.navigateToNewVisualization();
      await PageObjects.visualize.clickVisType('lens');
      await PageObjects.lens.switchDataPanelIndexPattern('logstash-*');
      await PageObjects.timePicker.setAbsoluteRange(
        'Sep 22, 2015 @ 00:00:00.000',
        'Sep 22, 2015 @ 04:00:00.000'
      );
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
