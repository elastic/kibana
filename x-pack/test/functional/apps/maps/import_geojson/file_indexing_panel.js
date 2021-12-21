/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import uuid from 'uuid/v4';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['maps', 'common']);
  const log = getService('log');
  const security = getService('security');
  const retry = getService('retry');

  async function loadFileAndIndex(loadFileName) {
    log.debug(`Uploading ${loadFileName} for indexing`);
    await PageObjects.maps.uploadJsonFileForIndexing(
      path.join(__dirname, 'test_upload_files', loadFileName)
    );
    await PageObjects.maps.waitForLayersToLoad();
    await PageObjects.maps.doesLayerExist('Import File');
    await PageObjects.maps.hasFilePickerLoadedFile(loadFileName);

    const indexName = uuid();
    await PageObjects.maps.setIndexName(indexName);
    await retry.try(async () => {
      const importButtonActive = await PageObjects.maps.importFileButtonEnabled();
      expect(importButtonActive).to.be(true);
    });
    await PageObjects.maps.clickImportFileButton();
    return indexName;
  }

  describe('geojson upload', () => {
    before(async () => {
      await security.testUser.setRoles(
        ['global_maps_all', 'geoall_data_writer', 'global_index_pattern_management_all'],
        false
      );
      await PageObjects.maps.openNewMap();
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    beforeEach(async () => {
      await PageObjects.maps.clickAddLayer();
      await PageObjects.maps.selectGeoJsonUploadSource();
    });

    afterEach(async () => {
      await PageObjects.maps.closeOrCancelLayer();
      await PageObjects.maps.waitForLayerAddPanelClosed();
    });

    it('should not activate add layer button until indexing succeeds', async () => {
      await loadFileAndIndex('point.json');

      let layerAddReady = await PageObjects.maps.importFileButtonEnabled();
      expect(layerAddReady).to.be(false);

      layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);
    });

    it('should load geojson file as ES document source layer', async () => {
      const indexName = await loadFileAndIndex('point.json');
      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);

      await PageObjects.maps.clickImportFileButton();
      const geojsonTempLayerExists = await PageObjects.maps.doesLayerExist('Import File');
      expect(geojsonTempLayerExists).to.be(false);

      const newIndexedLayerExists = await PageObjects.maps.doesLayerExist(indexName);
      expect(newIndexedLayerExists).to.be(true);
    });

    it('should remove index layer on cancel', async () => {
      const indexName = await loadFileAndIndex('point.json');

      const layerAddReady = await PageObjects.maps.importLayerReadyForAdd();
      expect(layerAddReady).to.be(true);

      await PageObjects.maps.cancelLayerAdd();
      const geojsonTempLayerExists = await PageObjects.maps.doesLayerExist('Import File');
      expect(geojsonTempLayerExists).to.be(false);

      const newIndexedLayerExists = await PageObjects.maps.doesLayerExist(indexName);
      expect(newIndexedLayerExists).to.be(false);
    });
  });
}
