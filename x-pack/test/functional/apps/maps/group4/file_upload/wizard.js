/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['geoFileUpload', 'maps']);
  const security = getService('security');
  const retry = getService('retry');

  describe('geo file upload wizard', () => {
    before(async () => {
      await security.testUser.setRoles([
        'global_maps_all',
        'geoall_data_writer',
        'global_index_pattern_management_all',
      ]);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    // describe block is testing a workflow and individual tests are not designed to be run out of order
    describe('preview layer workflow', () => {
      before(async () => {
        await PageObjects.maps.openNewMap();
        await PageObjects.maps.clickAddLayer();
        await PageObjects.maps.selectFileUploadCard();
        await PageObjects.geoFileUpload.previewGeoJsonFile(
          path.join(__dirname, 'files', 'point.json')
        );
        await PageObjects.maps.waitForLayersToLoad();
      });

      it('should add preview layer to map', async () => {
        const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(2);

        const hasLayer = await PageObjects.maps.doesLayerExist('point');
        expect(hasLayer).to.be(true);
      });

      it('should replace preivew layer on file change', async () => {
        await PageObjects.geoFileUpload.previewGeoJsonFile(
          path.join(__dirname, 'files', 'polygon.json')
        );
        await PageObjects.maps.waitForLayersToLoad();

        const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(2);

        const hasLayer = await PageObjects.maps.doesLayerExist('polygon');
        expect(hasLayer).to.be(true);
      });

      it('should disable next button when index already exists', async () => {
        await retry.try(async () => {
          expect(await PageObjects.geoFileUpload.isNextButtonEnabled()).to.be(true);
        });

        // "geo_shapes" index already exists, its added by es_archive
        await PageObjects.geoFileUpload.setIndexName('geo_shapes');
        await retry.try(async () => {
          expect(await PageObjects.geoFileUpload.isNextButtonEnabled()).to.be(false);
        });
      });

      it('should enable next button when index name is changed', async () => {
        await PageObjects.geoFileUpload.setIndexName('polygon');
        await retry.try(async () => {
          expect(await PageObjects.geoFileUpload.isNextButtonEnabled()).to.be(true);
        });
      });

      it('should remove preview layer on cancel', async () => {
        await PageObjects.maps.cancelLayerAdd();

        await PageObjects.maps.waitForLayerDeleted('polygon');
        const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
        expect(numberOfLayers).to.be(1);
      });
    });
  });
}
