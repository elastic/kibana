/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { APP_ID } from '../../../plugins/maps/common/constants';
import { FtrProviderContext } from '../ftr_provider_context';

export function GisPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'timePicker']);

  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const find = getService('find');
  const queryBar = getService('queryBar');
  const comboBox = getService('comboBox');
  const renderable = getService('renderable');
  const browser = getService('browser');
  const MenuToggle = getService('MenuToggle');

  const setViewPopoverToggle = new MenuToggle({
    name: 'SetView Popover',
    menuTestSubject: 'mapSetViewForm',
    toggleButtonTestSubject: 'toggleSetViewVisibilityButton',
  });

  function escapeLayerName(layerName: string) {
    return layerName.split(' ').join('_');
  }

  class GisPage {
    basePath;

    constructor() {
      this.basePath = '';
    }

    setBasePath(basePath: string) {
      this.basePath = basePath;
    }

    async setAbsoluteRange(start: string, end: string) {
      await PageObjects.timePicker.setAbsoluteRange(start, end);
      await this.waitForLayersToLoad();
    }

    async setAndSubmitQuery(query: string) {
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
    async waitForMapPanAndZoom(origView?: { lon: number; lat: number; zoom: number }) {
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
      await retry.try(async () => {
        const tableOfContents = await testSubjects.find('mapLayerTOC');
        await tableOfContents.waitForDeletedByCssSelector('.euiLoadingSpinner');
      });
    }

    async waitForLayerDeleted(layerName: string) {
      log.debug('Wait for layer deleted');
      await retry.waitFor('Layer to be deleted', async () => {
        const doesLayerExist = await this.doesLayerExist(layerName);
        return !doesLayerExist;
      });
    }

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    async loadSavedMap(name: string) {
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

    async deleteSavedMaps(search: string) {
      await this.searchForMapWithName(search);
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('deleteSelectedItems');
      await PageObjects.common.clickConfirmOnModal();

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async openNewMap() {
      log.debug(`Open new Map`);

      // Navigate directly because we don't need to go through the map listing
      // page. The listing page is skipped if there are no saved objects
      await PageObjects.common.navigateToUrlWithBrowserHistory(APP_ID, '/map');
      await renderable.waitForRender();
    }

    async saveMap(name: string, uncheckReturnToOriginModeSwitch = false) {
      await testSubjects.click('mapSaveButton');
      await testSubjects.setValue('savedObjectTitle', name);
      if (uncheckReturnToOriginModeSwitch) {
        const redirectToOriginCheckboxExists = await testSubjects.exists(
          'returnToOriginModeSwitch'
        );
        if (!redirectToOriginCheckboxExists) {
          throw new Error('Unable to uncheck "returnToOriginModeSwitch", it does not exist.');
        }
        await testSubjects.setEuiSwitch('returnToOriginModeSwitch', 'uncheck');
      }
      await testSubjects.clickWhenNotDisabled('confirmSaveSavedObjectButton');
    }

    async clickSaveAndReturnButton() {
      await testSubjects.click('mapSaveAndReturnButton');
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
      const exists = await testSubjects.exists('mapsListingPage', { timeout: 3500 });
      return exists;
    }

    async searchForMapWithName(name: string) {
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

    async selectMap(name: string) {
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
          await PageObjects.common.navigateToUrlWithBrowserHistory(APP_ID, '/');
          const onMapListingPage = await this.onMapListingPage();
          if (!onMapListingPage) throw new Error('Not on map listing page.');
        });
      }
    }

    async getMapCountWithName(name: string) {
      await this.gotoMapListingPage();

      log.debug(`getMapCountWithName: ${name}`);
      await this.searchForMapWithName(name);
      const buttons = await find.allByButtonText(name);
      return buttons.length;
    }

    async setView(lat: number, lon: number, zoom: number) {
      log.debug(
        `Set view lat: ${lat.toString()}, lon: ${lon.toString()}, zoom: ${zoom.toString()}`
      );
      await setViewPopoverToggle.open();
      await testSubjects.setValue('latitudeInput', lat.toString());
      await testSubjects.setValue('longitudeInput', lon.toString());
      await testSubjects.setValue('zoomInput', zoom.toString());
      await testSubjects.click('submitViewButton');
      await this.waitForMapPanAndZoom();
    }

    async getView() {
      log.debug('Get view');
      await setViewPopoverToggle.open();
      // this method is regularly called within a retry, so we need to reduce the timeouts
      // of the retries done within the getAttribute method in order to ensure that they fail
      // early enough to retry getView()
      const getAttributeOptions = {
        tryTimeout: 5000,
        findTimeout: 1000,
      };

      const lat = await testSubjects.getAttribute('latitudeInput', 'value', getAttributeOptions);
      const lon = await testSubjects.getAttribute('longitudeInput', 'value', getAttributeOptions);
      const zoom = await testSubjects.getAttribute('zoomInput', 'value', getAttributeOptions);

      await setViewPopoverToggle.close();
      return {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        zoom: parseFloat(zoom),
      };
    }

    async toggleLayerVisibility(layerName: string) {
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

    async clickFitToBounds(layerName: string) {
      log.debug(`Fit to bounds, layer: ${layerName}`);
      const origView = await this.getView();
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('fitToBoundsButton');
      await this.waitForMapPanAndZoom(origView);
    }

    async openLayerTocActionsPanel(layerName: string) {
      const escapedDisplayName = escapeLayerName(layerName);
      const isOpen = await testSubjects.exists(`layerTocActionsPanel${escapedDisplayName}`);
      if (!isOpen) {
        await testSubjects.click(`layerTocActionsPanelToggleButton${escapedDisplayName}`);
      }
    }

    async openLayerPanel(layerName: string) {
      log.debug(`Open layer panel, layer: ${layerName}`);
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('editLayerButton');
    }

    async closeLayerPanel() {
      await testSubjects.click('layerPanelCancelButton');
      await this.waitForLayersToLoad();
    }

    async getLayerTOCDetails(layerName: string) {
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

    async doesLayerExist(layerName: string) {
      return await testSubjects.exists(
        `layerTocActionsPanelToggleButton${escapeLayerName(layerName)}`
      );
    }

    async hasFilePickerLoadedFile(fileName: string) {
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

    async cancelLayerAdd(layerName: string) {
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

    async closeOrCancelLayer(layerName: string) {
      log.debug(`Close or cancel layer add`);
      const cancelExists = await testSubjects.exists('layerAddCancelButton');
      const closeExists = await testSubjects.exists('layerPanelCancelButton');
      if (cancelExists) {
        log.debug(`Cancel layer add.`);
        await testSubjects.click('layerAddCancelButton');
      } else if (closeExists) {
        log.debug(`Close layer add.`);
        await testSubjects.click('layerPanelCancelButton');
      } else {
        log.debug(`No need to close or cancel.`);
        return;
      }

      await this.waitForLayerAddPanelClosed();
      if (layerName) {
        await this.waitForLayerDeleted(layerName);
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

    async setIndexName(indexName: string) {
      log.debug(`Set index name to: ${indexName}`);
      await testSubjects.setValue('fileUploadIndexNameInput', indexName);
    }

    async setIndexType(indexType: string) {
      log.debug(`Set index type to: ${indexType}`);
      await testSubjects.selectValue('fileImportIndexSelect', indexType);
    }

    async indexTypeOptionExists(indexType: string) {
      log.debug(`Check index type "${indexType}" available`);
      return await find.existsByCssSelector(
        `select[data-test-subj="fileImportIndexSelect"] > option[value="${indexType}"]`
      );
    }

    async getCodeBlockParsedJson(dataTestSubjName: string) {
      log.debug(`Get parsed code block for ${dataTestSubjName}`);
      const indexRespCodeBlock = await testSubjects.find(`${dataTestSubjName}`);
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

    async setLayerQuery(layerName: string, query: string) {
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

    async setJoinWhereQuery(layerName: string, query: string) {
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
      await testSubjects.click('uploadGeoJson');
    }

    async uploadJsonFileForIndexing(path: string) {
      await PageObjects.common.setFileInputPath(path);
      log.debug(`File selected`);

      await PageObjects.header.waitUntilLoadingHasFinished();
      await this.waitForLayersToLoad();
    }

    // Returns first layer by default
    async selectVectorLayer(vectorLayerName: string) {
      log.debug(`Select EMS vector layer ${vectorLayerName}`);
      if (!vectorLayerName) {
        throw new Error(`You did not provide the EMS layer to select`);
      }
      await comboBox.set('emsVectorComboBox', vectorLayerName);
      await this.waitForLayersToLoad();
    }

    async removeLayer(layerName: string) {
      log.debug(`Remove layer ${layerName}`);
      await this.openLayerPanel(layerName);
      await testSubjects.click(`mapRemoveLayerButton`);
      await this.waitForLayerDeleted(layerName);
    }

    async getLayerErrorText(layerName: string) {
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
    async openInspectorRequest(requestName: string) {
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

    getInspectorStatRowHit(stats: string[][], rowName: string) {
      const STATS_ROW_NAME_INDEX = 0;
      const STATS_ROW_VALUE_INDEX = 1;

      const statsRow = stats.find((row) => {
        return row[STATS_ROW_NAME_INDEX] === rowName;
      });
      if (!statsRow) {
        throw new Error(`Unable to find value for row ${rowName} in ${stats}`);
      }

      return statsRow[STATS_ROW_VALUE_INDEX];
    }

    async triggerSingleRefresh(refreshInterval: number) {
      log.debug(`triggerSingleRefresh, refreshInterval: ${refreshInterval}`);
      await PageObjects.timePicker.resumeAutoRefresh();
      log.debug('waiting to give time for refresh timer to fire');
      await PageObjects.common.sleep(refreshInterval + refreshInterval / 2);
      await PageObjects.timePicker.pauseAutoRefresh();
      await this.waitForLayersToLoad();
    }

    async lockTooltipAtPosition(xOffset: number, yOffset: number) {
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

    async setStyleByValue(styleName: string, fieldName: string) {
      await testSubjects.selectValue(`staticDynamicSelect_${styleName}`, 'DYNAMIC');
      await comboBox.set(`styleFieldSelect_${styleName}`, fieldName);
    }

    async selectCustomColorRamp(styleName: string) {
      // open super select menu
      await testSubjects.click(`colorMapSelect_${styleName}`);
      // Click option
      await testSubjects.click(`colorMapSelectOption_CUSTOM_COLOR_MAP`);
    }

    async getCategorySuggestions() {
      return await comboBox.getOptionsList(`colorStopInput1`);
    }

    async enableAutoFitToBounds() {
      await testSubjects.click('openSettingsButton');
      const isEnabled = await testSubjects.getAttribute('autoFitToDataBoundsSwitch', 'checked');
      if (!isEnabled) {
        await retry.try(async () => {
          await testSubjects.click('autoFitToDataBoundsSwitch');
          const ensureEnabled = await testSubjects.getAttribute(
            'autoFitToDataBoundsSwitch',
            'checked'
          );
          if (!ensureEnabled) {
            throw new Error('autoFitToDataBoundsSwitch is not enabled');
          }
        });
      }
      await testSubjects.click('mapSettingSubmitButton');
    }

    async refreshAndClearUnsavedChangesWarning() {
      await browser.refresh();
      // accept alert if it pops up
      const alert = await browser.getAlert();
      await alert?.accept();
    }
  }
  return new GisPage();
}
