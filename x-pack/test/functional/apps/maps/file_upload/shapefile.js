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

  describe('shapefile upload', () => {
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

    it('should preview part of shapefile', async () => {
      await PageObjects.maps.clickAddLayer();
      await PageObjects.maps.selectFileUploadCard();
      await PageObjects.geoFileUpload.previewShapefile(
        path.join(__dirname, 'files', 'cb_2018_us_csa_500k.shp')
      );
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      // preview text is inconsistent. Skip expect for now
      // https://github.com/elastic/kibana/issues/124334
      /*
      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('cb_2018_us_csa_500k');
      expect(tooltipText).to.be(
        'cb_2018_us_csa_500k\nResults limited to 141 features, 81% of file.'
      );
      */
    });

    it('should import shapefile', async () => {
      indexName = uuid();
      await PageObjects.geoFileUpload.setIndexName(indexName);
      await PageObjects.geoFileUpload.uploadFile();

      const statusText = await PageObjects.geoFileUpload.getFileUploadStatusCalloutMsg();
      expect(statusText).to.be('File upload complete\nIndexed 174 features.');
    });

    it('should add as document layer', async () => {
      await PageObjects.geoFileUpload.addFileAsDocumentLayer();
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      await retry.try(async () => {
        await PageObjects.maps.waitForLayersToLoad();
        const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg(indexName);
        expect(tooltipText).to.be(`${indexName}\nFound 174 documents.`);
      });
    });
  });
}
