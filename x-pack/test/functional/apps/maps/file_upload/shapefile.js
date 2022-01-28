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

  describe('shapefile', () => {
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
        path.join(__dirname, 'test_upload_files', 'cb_2018_us_csa_500k.shp')
      );
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg('cb_2018_us_csa_500k');
      expect(tooltipText).to.be(
        'cb_2018_us_csa_500k\nResults limited to 141 features, 81% of file.'
      );
    });

    it('should import shapefile', async () => {
      indexName = uuid();
      await PageObjects.geoFileUpload.setIndexName(indexName);
      const importResults = await PageObjects.geoFileUpload.uploadFile();

      expect(importResults.docCount).to.be(174);
    });

    /*it('should add as document layer', async () => {
      // add layer as documents layer
      await PageObjects.maps.clickImportFileButton();
      await PageObjects.maps.waitForLayersToLoad();

      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      const tooltipText = await PageObjects.maps.getLayerTocTooltipMsg(indexName);
      expect(tooltipText).to.be(
        'cb_2018_us_csa_500k\nResults limited to 141 features, 81% of file.'
      );
    });*/
  });
}
