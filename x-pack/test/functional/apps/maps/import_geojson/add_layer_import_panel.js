/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import path from 'path';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['maps', 'common']);

  const IMPORT_FILE_PREVIEW_NAME = 'Import File';
  const FILE_LOAD_DIR = 'test_upload_files';
  const DEFAULT_LOAD_FILE_NAME = 'point.json';

  describe('GeoJSON import layer panel', () => {
    before(async () => {
      await PageObjects.maps.openNewMap();
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
      const layerLoadedInToc = await PageObjects.maps.doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
      expect(layerLoadedInToc).to.be(true);

      const filePickerLoadedFile = await PageObjects.maps.hasFilePickerLoadedFile(
        DEFAULT_LOAD_FILE_NAME
      );
      expect(filePickerLoadedFile).to.be(true);
    });

    it('should remove layer on cancel', async () => {
      await PageObjects.maps.cancelLayerAdd();

      await PageObjects.maps.waitForLayerDeleted(IMPORT_FILE_PREVIEW_NAME);
      const layerLoadedInToc = await PageObjects.maps.doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
      expect(layerLoadedInToc).to.be(false);
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
      const layerLoadedInToc = await PageObjects.maps.doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
      expect(layerLoadedInToc).to.be(false);
    });

    it('should prevent import button from activating unless valid index name provided', async () => {
      // Set index to invalid name
      await PageObjects.maps.setIndexName('NoCapitalLetters');
      // Check button
      let importButtonActive = await PageObjects.maps.importFileButtonEnabled();
      expect(importButtonActive).to.be(false);

      // Set index to valid name
      await PageObjects.maps.setIndexName('validindexname');
      // Check button
      importButtonActive = await PageObjects.maps.importFileButtonEnabled();
      expect(importButtonActive).to.be(true);

      // Set index back to invalid name
      await PageObjects.maps.setIndexName('?noquestionmarks?');
      // Check button
      importButtonActive = await PageObjects.maps.importFileButtonEnabled();
      expect(importButtonActive).to.be(false);
    });
  });
}
