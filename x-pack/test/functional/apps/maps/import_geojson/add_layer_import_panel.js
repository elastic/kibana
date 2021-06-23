/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['maps', 'common']);

  const FILE_LOAD_DIR = 'test_upload_files';
  const DEFAULT_LOAD_FILE_NAME = 'point.json';
  const security = getService('security');
  const retry = getService('retry');

  describe('GeoJSON import layer panel', () => {
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

    beforeEach(async () => {
      await PageObjects.maps.clickAddLayer();
      await PageObjects.maps.selectGeoJsonUploadSource();
      await PageObjects.maps.uploadJsonFileForIndexing(
        path.join(__dirname, FILE_LOAD_DIR, DEFAULT_LOAD_FILE_NAME)
      );
    });

    afterEach(async () => {
      await PageObjects.maps.closeOrCancelLayer();
    });

    it('should add GeoJSON file to map', async () => {
      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(2);

      const filePickerLoadedFile = await PageObjects.maps.hasFilePickerLoadedFile(
        DEFAULT_LOAD_FILE_NAME
      );
      expect(filePickerLoadedFile).to.be(true);
    });

    it('should remove layer on cancel', async () => {
      await PageObjects.maps.cancelLayerAdd();

      await PageObjects.maps.waitForLayerDeleted('point');
      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(1);
    });

    it('should replace layer on input change', async () => {
      // Upload second file
      const secondLoadFileName = 'polygon.json';
      await PageObjects.maps.uploadJsonFileForIndexing(
        path.join(__dirname, FILE_LOAD_DIR, secondLoadFileName)
      );
      await PageObjects.maps.waitForLayersToLoad();
      // Check second file is loaded in file picker
      const filePickerLoadedFile = await PageObjects.maps.hasFilePickerLoadedFile(
        secondLoadFileName
      );
      expect(filePickerLoadedFile).to.be(true);
    });

    it('should clear layer on replacement layer load error', async () => {
      // Upload second file
      const secondLoadFileName = 'not_json.txt';
      await PageObjects.maps.uploadJsonFileForIndexing(
        path.join(__dirname, FILE_LOAD_DIR, secondLoadFileName)
      );
      await PageObjects.maps.waitForLayersToLoad();
      // Check second file is loaded in file picker
      const filePickerLoadedFile = await PageObjects.maps.hasFilePickerLoadedFile(
        secondLoadFileName
      );
      expect(filePickerLoadedFile).to.be(true);
      // Check that no file is loaded in layer preview
      const numberOfLayers = await PageObjects.maps.getNumberOfLayers();
      expect(numberOfLayers).to.be(1);
    });

    it('should prevent import button from activating unless valid index name provided', async () => {
      await PageObjects.maps.setIndexName('NoCapitalLetters');
      await retry.try(async () => {
        const importButtonActive = await PageObjects.maps.importFileButtonEnabled();
        expect(importButtonActive).to.be(false);
      });

      await PageObjects.maps.setIndexName('validindexname');
      await retry.try(async () => {
        const importButtonActive = await PageObjects.maps.importFileButtonEnabled();
        expect(importButtonActive).to.be(true);
      });

      await PageObjects.maps.setIndexName('?noquestionmarks?');
      await retry.try(async () => {
        const importButtonActive = await PageObjects.maps.importFileButtonEnabled();
        expect(importButtonActive).to.be(false);
      });
    });
  });
}
