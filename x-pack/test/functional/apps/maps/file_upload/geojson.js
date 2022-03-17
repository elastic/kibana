/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import uuid from 'uuid/v4';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['geoFileUpload', 'maps']);
  const security = getService('security');
  const retry = getService('retry');

  describe('geojson file upload', () => {
    let indexName = '';
    before(async () => {
      await security.testUser.setRoles([
        'global_maps_all',
        'geoall_data_writer',
        'global_index_pattern_management_all',
      ]);
      await PageObjects.maps.openNewMap();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should preview part of geojson file', async () => {
      await PageObjects.maps.clickAddLayer();
      await PageObjects.maps.selectFileUploadCard();
      await PageObjects.geoFileUpload.previewGeoJsonFile(
        path.join(__dirname, 'files', 'world_countries_v7.geo.json')
      );
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('world_countries_v7');
      expect(tooltipText).to.be('world_countries_v7\nResults limited to 76 features, 41% of file.');
    });

    it('should import geojson', async () => {
      indexName = uuid();
      await PageObjects.geoFileUpload.setIndexName(indexName);
      await PageObjects.geoFileUpload.uploadFile();

      const statusText = await PageObjects.geoFileUpload.getFileUploadStatusCalloutMsg();
      expect(statusText).to.be('File upload complete\nIndexed 250 features.');
    });

    it('should add as document layer', async () => {
      await PageObjects.geoFileUpload.addFileAsDocumentLayer();
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      await retry.try(async () => {
        await PageObjects.maps.waitForLayersToLoad();
        const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg(indexName);
        expect(tooltipText).to.be(`${indexName}\nFound ~281 documents. This count is approximate.`);
      });
    });
  });
}
