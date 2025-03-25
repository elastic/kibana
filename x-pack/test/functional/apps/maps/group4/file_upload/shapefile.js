/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export default function ({ getPageObjects, getService }) {
  const { geoFileUpload, maps } = getPageObjects(['geoFileUpload', 'maps']);
  const security = getService('security');
  const retry = getService('retry');

  // Failing: See https://github.com/elastic/kibana/issues/209228
  describe.skip('shapefile upload', () => {
    let indexName = '';
    before(async () => {
      await security.testUser.setRoles([
        'global_maps_all',
        'geoall_data_writer',
        'global_index_pattern_management_all',
      ]);
      await maps.openNewMap();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should preview part of shapefile', async () => {
      await maps.clickAddLayer();
      await maps.selectFileUploadCard();
      await geoFileUpload.previewShapefile(
        path.join(__dirname, 'files', 'cb_2018_us_csa_500k.shp')
      );
      await maps.waitForLayersToLoad();

      const numberOfLayers = await maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      // preview text is inconsistent. Skip expect for now
      // https://github.com/elastic/kibana/issues/124334
      /*
      const tooltipText = await maps.getLayerTocTooltipMsg('cb_2018_us_csa_500k');
      expect(tooltipText).to.be(
        'cb_2018_us_csa_500k\nResults limited to 141 features, 81% of file.'
      );
      */
    });

    it('should import shapefile', async () => {
      indexName = uuidv4();
      await geoFileUpload.setIndexName(indexName);
      await geoFileUpload.uploadFile();

      const statusText = await geoFileUpload.getFileUploadStatusCalloutMsg();
      expect(statusText).to.be('File upload complete\nIndexed 174 features.');
    });

    it('should add as document layer', async () => {
      await geoFileUpload.addFileAsDocumentLayer();
      await maps.waitForLayersToLoad();

      const numberOfLayers = await maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      await retry.try(async () => {
        await maps.waitForLayersToLoad();
        const tooltipText = await maps.getLayerTocTooltipMsg(indexName);
        expect(tooltipText).to.be(`${indexName}\nFound 174 documents.`);
      });
    });
  });
}
