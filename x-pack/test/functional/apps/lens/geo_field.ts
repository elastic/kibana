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
      const hits = await PageObjects.maps.getHits();
      expect(hits).to.equal('66');
      await PageObjects.maps.refreshAndClearUnsavedChangesWarning();
    });
  });
}
