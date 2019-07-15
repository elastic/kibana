/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import path from 'path';
import uuid from 'uuid/v4';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['maps', 'common']);
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  const IMPORT_FILE_PREVIEW_NAME = 'Import File';
  const FILE_LOAD_DIR = 'test_upload_files';
  const DEFAULT_LOAD_POINT_FILE_NAME = 'point.json';
  let indexName;

  const indexPoint = async () => await loadFileAndIndex(DEFAULT_LOAD_POINT_FILE_NAME);
  const indexFileByName = async fileName => await loadFileAndIndex(fileName);

  async function loadFileAndIndex(loadFileName) {
    await PageObjects.maps.clickAddLayer();
    // Verify panel page element is open
    const panelOpen = await PageObjects.maps.isLayerAddPanelOpen();
    expect(panelOpen).to.be(true);
    // Select upload source
    await PageObjects.maps.selectGeoJsonUploadSource();
    // Upload file
    log.debug(`Uploading ${loadFileName} for indexing`);
    await PageObjects.maps.uploadJsonFileForIndexing(
      path.join(__dirname, FILE_LOAD_DIR, loadFileName)
    );
    await PageObjects.maps.waitForLayersToLoad();
    // Check file upload in TOC
    const layerLoadedInToc = await PageObjects.maps
      .doesLayerExist(IMPORT_FILE_PREVIEW_NAME);
    expect(layerLoadedInToc).to.be(true);
    // Check file is loaded in file picker
    const filePickerLoadedFile = await PageObjects.maps
      .hasFilePickerLoadedFile(loadFileName);
    expect(filePickerLoadedFile).to.be(true);
    // Set index name to something random & unrepeating
    indexName = uuid();
    await PageObjects.maps.setIndexName(indexName);
    // Import file
    await PageObjects.maps.clickImportFileButton();
  }

  describe('On index name & pattern operation complete', () => {
    before(async () => {
      await PageObjects.maps.openNewMap();
    });

    afterEach(async () => {
      await PageObjects.maps.cancelLayerAdd();
    });

    it('should not activate add layer button until indexing succeeds', async () => {
      await indexPoint();
      // Should be disabled at first
      let layerAddReady = await PageObjects.maps.importFileButtonEnabled();
      expect(layerAddReady).to.be(false);
      // Should be enabled on index complete
      layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
    });

    it('GeoJson file layer removed, ES search layer added', async () => {
      await indexPoint();
      // Add indexed layer
      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
      await PageObjects.maps.clickImportFileButton();

      // Check temp layer removed and index layer added
      const geojsonTempLayerExists = await PageObjects.maps.doesLayerExist('Import File');
      expect(geojsonTempLayerExists).to.be(false);
      const newIndexedLayerExists = await PageObjects.maps.doesLayerExist(indexName);
      expect(newIndexedLayerExists).to.be(true);
    });

    it('should remove index layer on cancel', async () => {
      await indexPoint();
      // Add indexed layer
      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
      await PageObjects.maps.cancelLayerAdd();

      // Check temp layer and index layer removed
      const geojsonTempLayerExists = await PageObjects.maps.doesLayerExist('Import File');
      expect(geojsonTempLayerExists).to.be(false);
      const newIndexedLayerExists = await PageObjects.maps.doesLayerExist(indexName);
      expect(newIndexedLayerExists).to.be(false);
    });

    it('should create a link to new index in management', async () => {
      await indexPoint();
      // Add indexed layer
      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
      // Check index link
      const newIndexLinkExists = await testSubjects.exists('indexManagementNewIndexLink');
      expect(newIndexLinkExists).to.be(true);
      const indexLink = await testSubjects.getAttribute('indexManagementNewIndexLink', 'href');
      // The only dynamic portion of the link is the end, just test this
      const linkDirectsToNewIndex = indexLink.endsWith(indexName);
      expect(linkDirectsToNewIndex).to.be(true);
    });

    it('should still allow layer add if some failures occurred', async () => {
      await indexFileByName('multi_polygon_with_invalid_geometries.json');
      const indexResults = await PageObjects.maps.getIndexResults();
      const failures = indexResults.failures.length;
      expect(failures).to.be.greaterThan(0);

      // Check that layer add option is available
      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
    });

    const GEO_POINT = 'geo_point';
    const pointFiles = ['point.json', 'multi_point.json'];
    pointFiles.forEach(async pointFile => {
      it(`should index with type geo_point for file: ${pointFile}`,
        async () => {
          await indexFileByName(pointFile);
          const indexPatternResults = await PageObjects.maps.getIndexPatternResults();
          const coordinatesField = indexPatternResults.fields.find(
            ({ name }) => name === 'coordinates'
          );
          expect(coordinatesField.type).to.be(GEO_POINT);
        });
    });

    const GEO_SHAPE = 'geo_shape';
    const shapeFiles = [
      'line_string.json', 'multi_line_string.json', 'multi_polygon.json',
      'polygon.json'
    ];
    shapeFiles.forEach(async shapeFile => {
      it(`should index with type geo_shape for file: ${shapeFile}`,
        async () => {
          await indexFileByName(shapeFile);
          const indexPatternResults = await PageObjects.maps.getIndexPatternResults();
          const coordinatesField = indexPatternResults.fields.find(
            ({ name }) => name === 'coordinates'
          );
          expect(coordinatesField.type).to.be(GEO_SHAPE);
        });
    });
  });
}
