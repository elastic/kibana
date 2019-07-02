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
  const DEFAULT_LOAD_FILE_NAME = 'Point.json';
  const GEO_POINT = 'geo_point';
  const GEO_SHAPE = 'geo_shape';

  describe('Import layer panel', () => {
    before(async () => {
      await PageObjects.maps.openNewMap();
    });

    beforeEach(async () => {
      await PageObjects.maps.clickAddLayer();
      // Verify panel page element is open
      const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
      expect(panelOpen).to.be(true);
      // Select upload source
      await PageObjects.maps.selectGeoJsonUploadSource();
      // Upload file
      await PageObjects.maps.uploadJsonFileForIndexing(
        path.join(__dirname, FILE_LOAD_DIR, DEFAULT_LOAD_FILE_NAME)
      );
      await PageObjects.maps.waitForLayersToLoad();
      // Check file upload in TOC
      const layerLoadedInToc = await PageObjects.maps
        .doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
      expect(layerLoadedInToc).to.be(true);
      // Check file is loaded in file picker
      const filePickerLoadedFile = await PageObjects.maps
        .hasFilePickerLoadedFile(DEFAULT_LOAD_FILE_NAME);
      expect(filePickerLoadedFile).to.be(true);

    });

    afterEach(async () => {
      await PageObjects.maps.cancelLayerAdd();
    });

    it('should close & remove preview layer on clicking "Cancel" after uploading file',
      async () => {
        // Click cancel
        await PageObjects.maps.cancelLayerAdd();
        // Verify panel isn't open
        const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
        expect(panelOpen).to.be(false);
        // Verify layer has been removed
        await PageObjects.maps.waitForLayerDeleted(IMPORT_FILE_PREVIEW_NAME);
        const layerLoadedInToc = await PageObjects.maps.doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
        expect(layerLoadedInToc).to.be(false);
      });

    it('should replace layer on input change',
      async () => {
        // Upload second file
        const secondLoadFileName = 'Polygon.json';
        await PageObjects.maps.uploadJsonFileForIndexing(
          path.join(__dirname, FILE_LOAD_DIR, secondLoadFileName)
        );
        await PageObjects.maps.waitForLayersToLoad();
        // Check second file is loaded in file picker
        const filePickerLoadedFile = await PageObjects.maps
          .hasFilePickerLoadedFile(secondLoadFileName);
        expect(filePickerLoadedFile).to.be(true);
      });

    it('should clear layer on replacement layer load error',
      async () => {
        // Upload second file
        const secondLoadFileName = 'notJson.txt';
        await PageObjects.maps.uploadJsonFileForIndexing(
          path.join(__dirname, FILE_LOAD_DIR, secondLoadFileName)
        );
        await PageObjects.maps.waitForLayersToLoad();
        // Check second file is loaded in file picker
        const filePickerLoadedFile = await PageObjects.maps
          .hasFilePickerLoadedFile(secondLoadFileName);
        expect(filePickerLoadedFile).to.be(true);
        // Check that no file is loaded in layer preview
        const layerLoadedInToc = await PageObjects.maps.doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
        expect(layerLoadedInToc).to.be(false);
      });

    it('should supply the correct index type(s) (geo_point or geo_shape) for the source',
      async () => {
        // Confirm point selected for default file, confirm shape also an option
        let isGeoPointAvab = await PageObjects.maps.indexTypeOptionExists(GEO_POINT);
        expect(isGeoPointAvab).to.be(true);
        let isGeoShapeAvab = await PageObjects.maps.indexTypeOptionExists(GEO_SHAPE);
        expect(isGeoShapeAvab).to.be(true);

        // Upload shape file
        const polygonJsonFile = 'Polygon.json';
        await PageObjects.maps.uploadJsonFileForIndexing(
          path.join(__dirname, FILE_LOAD_DIR, polygonJsonFile)
        );
        await PageObjects.maps.waitForLayersToLoad();

        // Confirm shape only option
        isGeoPointAvab = await PageObjects.maps.indexTypeOptionExists(GEO_POINT);
        expect(isGeoPointAvab).to.be(false);
        isGeoShapeAvab = await PageObjects.maps.indexTypeOptionExists(GEO_SHAPE);
        expect(isGeoShapeAvab).to.be(true);

        // Multis
        // Upload multipoint file
        const multiPointJsonFile = 'MultiPoint.json';
        await PageObjects.maps.uploadJsonFileForIndexing(
          path.join(__dirname, FILE_LOAD_DIR, multiPointJsonFile)
        );
        await PageObjects.maps.waitForLayersToLoad();

        // Confirm point selected for default file, confirm shape also an option
        isGeoPointAvab = await PageObjects.maps.indexTypeOptionExists(GEO_POINT);
        expect(isGeoPointAvab).to.be(true);
        isGeoShapeAvab = await PageObjects.maps.indexTypeOptionExists(GEO_SHAPE);
        expect(isGeoShapeAvab).to.be(true);

        // Upload multipolygon file
        const multiPolygonJsonFile = 'MultiPolygon.json';
        await PageObjects.maps.uploadJsonFileForIndexing(
          path.join(__dirname, FILE_LOAD_DIR, multiPolygonJsonFile)
        );
        await PageObjects.maps.waitForLayersToLoad();

        // Confirm point selected for default file, confirm shape also an option
        isGeoPointAvab = await PageObjects.maps.indexTypeOptionExists(GEO_POINT);
        expect(isGeoPointAvab).to.be(false);
        isGeoShapeAvab = await PageObjects.maps.indexTypeOptionExists(GEO_SHAPE);
        expect(isGeoShapeAvab).to.be(true);
      });

    it('should prevent import button from activating unless valid index name provided',
      async () => {
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
