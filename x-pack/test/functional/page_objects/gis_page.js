/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export function GisPageProvider({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'header', 'timePicker']);

  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const find = getService('find');
  const queryBar = getService('queryBar');
  const comboBox = getService('comboBox');

  function escapeLayerName(layerName) {
    return layerName.split(' ').join('_');
  }

  class GisPage {
    constructor() {
      this.basePath = '';
    }

    setBasePath(basePath) {
      this.basePath = basePath;
    }

    async setAbsoluteRange(start, end) {
      await PageObjects.timePicker.setAbsoluteRange(start, end);
      await this.waitForLayersToLoad();
    }

    async setAndSubmitQuery(query) {
      await queryBar.setQuery(query);
      await queryBar.submitQuery();
      await this.waitForLayersToLoad();
    }

    async refreshQuery() {
      await queryBar.submitQuery();
      await this.waitForLayersToLoad();
    }

    async enterFullScreen() {
      log.debug(`enterFullScreen`);
      await testSubjects.click('mapsFullScreenMode');
      await retry.try(async () => {
        await testSubjects.exists('exitFullScreenModeLogo');
      });
      await this.waitForLayersToLoad();
    }

    // TODO combine with dashboard full screen into a service
    async existFullScreen() {
      log.debug(`existFullScreen`);
      const isFullScreen = await testSubjects.exists('exitFullScreenModeLogo');
      if (isFullScreen) {
        await testSubjects.click('exitFullScreenModeLogo');
      }
    }

    // Since there are no DOM indicators that signal when map pan and zoom actions are complete,
    // this method waits until the map view has stabilized, signaling that the panning/zooming is complete.
    // Pass origView parameter when the new map view determinition is async
    // so method knows when panning/zooming has started.
    async waitForMapPanAndZoom(origView) {
      await retry.try(async () => {
        log.debug('Waiting for map pan and zoom to complete');
        const prevView = await this.getView();
        await PageObjects.common.sleep(1000);
        const currentView = await this.getView();
        if (origView && _.isEqual(origView, currentView)) {
          throw new Error('Map pan and zoom has not started yet');
        }
        if (!_.isEqual(prevView, currentView)) {
          throw new Error('Map is still panning and zooming');
        }
      });
      await this.waitForLayersToLoad();
    }

    async waitForLayersToLoad() {
      log.debug('Wait for layers to load');
      const tableOfContents = await testSubjects.find('mapLayerTOC');
      await retry.try(async () => {
        await tableOfContents.waitForDeletedByCssSelector('.euiLoadingSpinner');
      });
    }

    async waitForLayerDeleted(layerName) {
      log.debug('Wait for layer deleted');
      await retry.waitFor('Layer to be deleted', async () => {
        const doesLayerExist = await this.doesLayerExist(layerName);
        return !doesLayerExist;
      });
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    async loadSavedMap(name) {
      log.debug(`Load Saved Map ${name}`);

      await retry.try(async () => {
        await this.searchForMapWithName(name);
        await this.selectMap(name);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const onMapListingPage = await this.onMapListingPage();
        if (onMapListingPage) {
          throw new Error(`Failed to open map ${name}`);
        }
      });

      await this.waitForLayersToLoad();
    }

    async deleteSavedMaps(search) {
      await this.searchForMapWithName(search);
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('deleteSelectedItems');
      await PageObjects.common.clickConfirmOnModal();

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async openNewMap() {
      log.debug(`Open new Map`);

      await this.gotoMapListingPage();
      await testSubjects.click('newMapLink');
    }

    async saveMap(name) {
      await testSubjects.click('mapSaveButton');
      await testSubjects.setValue('savedObjectTitle', name);
      await testSubjects.clickWhenNotDisabled('confirmSaveSavedObjectButton');
    }

    async expectMissingSaveButton() {
      await testSubjects.missingOrFail('mapSaveButton');
    }

    async expectMissingCreateNewButton() {
      await testSubjects.missingOrFail('newMapLink');
    }

    async expectMissingAddLayerButton() {
      await testSubjects.missingOrFail('addLayerButton');
    }

    async expectExistAddLayerButton() {
      await testSubjects.existOrFail('addLayerButton');
    }

    async onMapListingPage() {
      log.debug(`onMapListingPage`);
      const exists = await testSubjects.exists('mapsListingPage');
      return exists;
    }

    async searchForMapWithName(name) {
      log.debug(`searchForMapWithName: ${name}`);

      await this.gotoMapListingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
        await searchFilter.click();
        await searchFilter.type(name);
        await PageObjects.common.pressEnterKey();
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectMap(name) {
      await testSubjects.click(`mapListingTitleLink-${name.split(' ').join('-')}`);
    }

    async getHits() {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      const requestStats = await inspector.getTableData();
      const hits = this.getInspectorStatRowHit(requestStats, 'Hits');
      await inspector.close();
      return hits;
    }

    async gotoMapListingPage() {
      log.debug('gotoMapListingPage');
      const onPage = await this.onMapListingPage();
      if (!onPage) {
        await retry.try(async () => {
          await PageObjects.common.navigateToUrl('maps', '/', { basePath: this.basePath });
          const onMapListingPage = await this.onMapListingPage();
          if (!onMapListingPage) throw new Error('Not on map listing page.');
        });
      }
    }

    async getMapCountWithName(name) {
      await this.gotoMapListingPage();

      log.debug(`getMapCountWithName: ${name}`);
      await this.searchForMapWithName(name);
      const links = await find.allByLinkText(name);
      return links.length;
    }

    async openSetViewPopover() {
      const isOpen = await testSubjects.exists('mapSetViewForm');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('toggleSetViewVisibilityButton');
          const isOpenAfterClick = await testSubjects.exists('mapSetViewForm');
          if (!isOpenAfterClick) {
            throw new Error('set view popover not opened');
          }
        });
      }
    }

    async closeSetViewPopover() {
      const isOpen = await testSubjects.exists('mapSetViewForm');
      if (isOpen) {
        await retry.try(async () => {
          await testSubjects.click('toggleSetViewVisibilityButton');
          const isOpenAfterClick = await testSubjects.exists('mapSetViewForm');
          if (isOpenAfterClick) {
            throw new Error('set view popover not closed');
          }
        });
      }
    }

    async setView(lat, lon, zoom) {
      log.debug(
        `Set view lat: ${lat.toString()}, lon: ${lon.toString()}, zoom: ${zoom.toString()}`
      );
      await this.openSetViewPopover();
      await testSubjects.setValue('latitudeInput', lat.toString());
      await testSubjects.setValue('longitudeInput', lon.toString());
      await testSubjects.setValue('zoomInput', zoom.toString());
      await testSubjects.click('submitViewButton');
      await this.waitForMapPanAndZoom();
    }

    async getView() {
      log.debug('Get view');
      await this.openSetViewPopover();
      const lat = await testSubjects.getAttribute('latitudeInput', 'value');
      const lon = await testSubjects.getAttribute('longitudeInput', 'value');
      const zoom = await testSubjects.getAttribute('zoomInput', 'value');
      await this.closeSetViewPopover();
      return {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        zoom: parseFloat(zoom),
      };
    }

    async toggleLayerVisibility(layerName) {
      log.debug(`Toggle layer visibility, layer: ${layerName}`);
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('layerVisibilityToggleButton');
    }

    async closeLegend() {
      const isOpen = await testSubjects.exists('mapLayerTOC');
      if (isOpen) {
        await testSubjects.click('mapToggleLegendButton');
        await testSubjects.waitForDeleted('mapLayerTOC');
      }
    }

    async clickFitToBounds(layerName) {
      log.debug(`Fit to bounds, layer: ${layerName}`);
      const origView = await this.getView();
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('fitToBoundsButton');
      await this.waitForMapPanAndZoom(origView);
    }

    async openLayerTocActionsPanel(layerName) {
      const escapedDisplayName = escapeLayerName(layerName);
      const isOpen = await testSubjects.exists(`layerTocActionsPanel${escapedDisplayName}`);
      if (!isOpen) {
        await testSubjects.click(`layerTocActionsPanelToggleButton${escapedDisplayName}`);
      }
    }

    async openLayerPanel(layerName) {
      log.debug(`Open layer panel, layer: ${layerName}`);
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('editLayerButton');
    }

    async closeLayerPanel() {
      await testSubjects.click('layerPanelCancelButton');
      await this.waitForLayersToLoad();
    }

    async getLayerTOCDetails(layerName) {
      return await testSubjects.getVisibleText(`mapLayerTOCDetails${escapeLayerName(layerName)}`);
    }

    async disableApplyGlobalQuery() {
      const isSelected = await testSubjects.getAttribute(
        'mapLayerPanelApplyGlobalQueryCheckbox',
        'aria-checked'
      );
      if (isSelected === 'true') {
        await retry.try(async () => {
          log.debug(`disabling applyGlobalQuery`);
          await testSubjects.click('mapLayerPanelApplyGlobalQueryCheckbox');
          const isStillSelected = await testSubjects.getAttribute(
            'mapLayerPanelApplyGlobalQueryCheckbox',
            'aria-checked'
          );
          if (isStillSelected === 'true') {
            throw new Error('applyGlobalQuery not disabled');
          }
        });
        await this.waitForLayersToLoad();
      }
    }

    async doesLayerExist(layerName) {
      return await testSubjects.exists(
        `layerTocActionsPanelToggleButton${escapeLayerName(layerName)}`
      );
    }

    async hasFilePickerLoadedFile(fileName) {
      log.debug(`Has file picker loaded file ${fileName}`);
      const filePickerText = await find.byCssSelector('.euiFilePicker__promptText');
      const filePickerTextContent = await filePickerText.getVisibleText();

      return fileName === filePickerTextContent;
    }

    /*
     * Layer panel utility functions
     */
    async isLayerAddPanelOpen() {
      log.debug(`Is layer add panel open`);
      return await testSubjects.exists('layerAddForm');
    }

    async waitForLayerAddPanelClosed() {
      let layerAddPanelOpen = false;
      await retry.waitForWithTimeout('Layer add panel closed', 1000, async () => {
        layerAddPanelOpen = await this.isLayerAddPanelOpen();
        return !layerAddPanelOpen;
      });
    }

    async clickAddLayer() {
      log.debug('Click add layer');
      await retry.try(async () => {
        await testSubjects.click('addLayerButton');
        const isOpen = await this.isLayerAddPanelOpen();
        if (!isOpen) {
          throw new Error('Add layer panel still not open, trying again.');
        }
      });
    }

    async cancelLayerAdd(layerName) {
      log.debug(`Cancel layer add`);
      const cancelExists = await testSubjects.exists('layerAddCancelButton');
      if (cancelExists) {
        await testSubjects.click('layerAddCancelButton');
        await this.waitForLayerAddPanelClosed();
        if (layerName) {
          await this.waitForLayerDeleted(layerName);
        }
      }
    }

    async importFileButtonEnabled() {
      log.debug(`Check "Import file" button enabled`);
      const importFileButton = await testSubjects.find('importFileButton');
      const isDisabled = await importFileButton.getAttribute('disabled');
      return !isDisabled;
    }

    async importLayerReadyForAdd() {
      log.debug(`Wait until import complete`);
      await testSubjects.find('indexRespCodeBlock', 5000);
      let layerAddReady = false;
      await retry.waitForWithTimeout('Add layer button ready', 2000, async () => {
        layerAddReady = await this.importFileButtonEnabled();
        return layerAddReady;
      });
      return layerAddReady;
    }

    async clickImportFileButton() {
      log.debug(`Click "Import file" button`);
      await testSubjects.click('importFileButton');
    }

    async setIndexName(indexName) {
      log.debug(`Set index name to: ${indexName}`);
      await testSubjects.setValue('fileUploadIndexNameInput', indexName);
    }

    async setIndexType(indexType) {
      log.debug(`Set index type to: ${indexType}`);
      await testSubjects.selectValue('fileImportIndexSelect', indexType);
    }

    async indexTypeOptionExists(indexType) {
      log.debug(`Check index type "${indexType}" available`);
      return await find.existsByCssSelector(
        `select[data-test-subj="fileImportIndexSelect"] > option[value="${indexType}"]`
      );
    }

    async getCodeBlockParsedJson(dataTestSubjName) {
      log.debug(`Get parsed code block for ${dataTestSubjName}`);
      const indexRespCodeBlock = await find.byCssSelector(`[data-test-subj="${dataTestSubjName}"]`);
      const indexRespJson = await indexRespCodeBlock.getAttribute('innerText');
      return JSON.parse(indexRespJson);
    }

    async getIndexResults() {
      log.debug('Get index results');
      return await this.getCodeBlockParsedJson('indexRespCodeBlock');
    }

    async getIndexPatternResults() {
      log.debug('Get index pattern results');
      return await this.getCodeBlockParsedJson('indexPatternRespCodeBlock');
    }

    async setLayerQuery(layerName, query) {
      await this.openLayerPanel(layerName);
      await testSubjects.click('mapLayerPanelOpenFilterEditorButton');
      const filterEditorContainer = await testSubjects.find('mapFilterEditor');
      const queryBarInFilterEditor = await testSubjects.findDescendant(
        'queryInput',
        filterEditorContainer
      );
      await queryBarInFilterEditor.click();
      const input = await find.activeElement();
      await retry.try(async () => {
        await input.clearValue();
        await input.type(query);
        const value = await input.getAttribute('value');
        if (value !== query) {
          throw new Error(`Layer query set to ${value} instead of ${query}`);
        }
      });
      await testSubjects.click('mapFilterEditorSubmitButton');
      await this.waitForLayersToLoad();
    }

    async setJoinWhereQuery(layerName, query) {
      await this.openLayerPanel(layerName);
      await testSubjects.click('mapJoinWhereExpressionButton');
      const filterEditorContainer = await testSubjects.find('mapJoinWhereFilterEditor');
      const queryBarInFilterEditor = await testSubjects.findDescendant(
        'queryInput',
        filterEditorContainer
      );
      await queryBarInFilterEditor.click();
      const input = await find.activeElement();
      await input.clearValue();
      await input.type(query);
      await testSubjects.click('mapWhereFilterEditorSubmitButton');
      await this.waitForLayersToLoad();
    }

    async selectEMSBoundariesSource() {
      log.debug(`Select EMS boundaries source`);
      await testSubjects.click('emsBoundaries');
    }

    async selectGeoJsonUploadSource() {
      log.debug(`Select upload geojson source`);
      await testSubjects.click('uploadedGeoJson');
    }

    async uploadJsonFileForIndexing(path) {
      log.debug(`Setting the path on the file input`);
      const input = await find.byCssSelector('.euiFilePicker__input');
      await input.type(path);
      log.debug(`File selected`);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await this.waitForLayersToLoad();
    }

    // Returns first layer by default
    async selectVectorLayer(vectorLayerName) {
      log.debug(`Select EMS vector layer ${vectorLayerName}`);
      if (!vectorLayerName) {
        throw new Error(`You did not provide the EMS layer to select`);
      }
      await comboBox.set('emsVectorComboBox', vectorLayerName);
      await this.waitForLayersToLoad();
    }

    async removeLayer(layerName) {
      log.debug(`Remove layer ${layerName}`);
      await this.openLayerPanel(layerName);
      await testSubjects.click(`mapRemoveLayerButton`);
      await this.waitForLayerDeleted(layerName);
    }

    async getLayerErrorText(layerName) {
      log.debug(`Remove layer ${layerName}`);
      await this.openLayerPanel(layerName);
      return await testSubjects.getVisibleText(`layerErrorMessage`);
    }

    async fullScreenModeMenuItemExists() {
      return await testSubjects.exists('mapsFullScreenMode');
    }

    async clickFullScreenMode() {
      log.debug(`clickFullScreenMode`);
      await testSubjects.click('mapsFullScreenMode');
    }

    async exitFullScreenLogoButtonExists() {
      return await testSubjects.exists('exitFullScreenModeLogo');
    }

    async getExitFullScreenLogoButton() {
      return await testSubjects.find('exitFullScreenModeLogo');
    }

    async clickExitFullScreenTextButton() {
      await testSubjects.click('exitFullScreenModeText');
    }

    async openInspectorMapView() {
      await inspector.openInspectorView('~inspectorViewChooserMap');
    }

    // Method should only be used when multiple requests are expected
    // RequestSelector will only display inspectorRequestChooser when there is more than one request
    async openInspectorRequest(requestName) {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      log.debug(`Open Inspector request ${requestName}`);
      await testSubjects.click('inspectorRequestChooser');
      await testSubjects.click(`inspectorRequestChooser${requestName}`);
    }

    async doesInspectorHaveRequests() {
      await inspector.open();
      await inspector.openInspectorRequestsView();
      return await testSubjects.exists('inspectorNoRequestsMessage');
    }

    async getMapboxStyle() {
      log.debug('getMapboxStyle');
      await inspector.open();
      await this.openInspectorMapView();
      await testSubjects.click('mapboxStyleTab');
      const mapboxStyleContainer = await testSubjects.find('mapboxStyleContainer');
      const mapboxStyleJson = await mapboxStyleContainer.getVisibleText();
      await inspector.close();
      let mapboxStyle;
      try {
        mapboxStyle = JSON.parse(mapboxStyleJson);
      } catch (err) {
        throw new Error(`Unable to parse mapbox style, error: ${err.message}`);
      }
      return mapboxStyle;
    }

    getInspectorStatRowHit(stats, rowName) {
      const STATS_ROW_NAME_INDEX = 0;
      const STATS_ROW_VALUE_INDEX = 1;

      const statsRow = stats.find(statsRow => {
        return statsRow[STATS_ROW_NAME_INDEX] === rowName;
      });
      if (!statsRow) {
        throw new Error(`Unable to find value for row ${rowName} in ${stats}`);
      }

      return statsRow[STATS_ROW_VALUE_INDEX];
    }

    async triggerSingleRefresh(refreshInterval) {
      log.debug(`triggerSingleRefresh, refreshInterval: ${refreshInterval}`);
      await PageObjects.timePicker.resumeAutoRefresh();
      log.debug('waiting to give time for refresh timer to fire');
      await PageObjects.common.sleep(refreshInterval + refreshInterval / 2);
      await PageObjects.timePicker.pauseAutoRefresh();
      await this.waitForLayersToLoad();
    }

    async lockTooltipAtPosition(xOffset, yOffset) {
      await retry.try(async () => {
        const mapContainerElement = await testSubjects.find('mapContainer');
        await mapContainerElement.moveMouseTo({ xOffset, yOffset });
        await mapContainerElement.clickMouseButton({ xOffset, yOffset });
        // Close button is only displayed with tooltip is locked
        const hasCloseButton = await testSubjects.exists('mapTooltipCloseButton');
        if (!hasCloseButton) {
          throw new Error('Tooltip is not locked at position');
        }
      });
    }
  }
  return new GisPage();
}
