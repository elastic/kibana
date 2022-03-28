/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { APP_ID } from '../../../plugins/maps/common/constants';
import { FtrService } from '../ftr_provider_context';

function escapeLayerName(layerName: string) {
  return layerName.split(' ').join('_');
}

export class GisPageObject extends FtrService {
  private readonly common = this.ctx.getPageObject('common');
  private readonly header = this.ctx.getPageObject('header');
  private readonly timePicker = this.ctx.getPageObject('timePicker');
  private readonly visualize = this.ctx.getPageObject('visualize');

  private readonly log = this.ctx.getService('log');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly retry = this.ctx.getService('retry');
  private readonly inspector = this.ctx.getService('inspector');
  private readonly find = this.ctx.getService('find');
  private readonly queryBar = this.ctx.getService('queryBar');
  private readonly comboBox = this.ctx.getService('comboBox');
  private readonly renderable = this.ctx.getService('renderable');
  private readonly browser = this.ctx.getService('browser');
  private readonly listingTable = this.ctx.getService('listingTable');
  private readonly monacoEditor = this.ctx.getService('monacoEditor');
  private readonly dashboardPanelActions = this.ctx.getService('dashboardPanelActions');

  private readonly setViewPopoverToggle = this.ctx.getService('menuToggle').create({
    name: 'SetView Popover',
    menuTestSubject: 'mapSetViewForm',
    toggleButtonTestSubject: 'toggleSetViewVisibilityButton',
  });

  basePath = '';

  setBasePath(basePath: string) {
    this.basePath = basePath;
  }

  async setAbsoluteRange(start: string, end: string) {
    await this.timePicker.setAbsoluteRange(start, end);
    await this.waitForLayersToLoad();
  }

  async setAndSubmitQuery(query: string) {
    await this.queryBar.setQuery(query);
    await this.queryBar.submitQuery();
    await this.waitForLayersToLoad();
  }

  async refreshQuery() {
    await this.queryBar.submitQuery();
    await this.waitForLayersToLoad();
  }

  async enterFullScreen() {
    this.log.debug(`enterFullScreen`);
    await this.testSubjects.click('mapsFullScreenMode');
    await this.retry.try(async () => {
      await this.testSubjects.exists('exitFullScreenModeLogo');
    });
    await this.waitForLayersToLoad();
  }

  // TODO combine with dashboard full screen into a service
  async existFullScreen() {
    this.log.debug(`existFullScreen`);
    const isFullScreen = await this.testSubjects.exists('exitFullScreenModeLogo');
    if (isFullScreen) {
      await this.testSubjects.click('exitFullScreenModeLogo');
    }
  }

  // Since there are no DOM indicators that signal when map pan and zoom actions are complete,
  // this method waits until the map view has stabilized, signaling that the panning/zooming is complete.
  // Pass origView parameter when the new map view determinition is async
  // so method knows when panning/zooming has started.
  async waitForMapPanAndZoom(origView?: { lon: number; lat: number; zoom: number }) {
    await this.retry.try(async () => {
      this.log.debug('Waiting for map pan and zoom to complete');
      const prevView = await this.getView();
      await this.common.sleep(1000);
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
    this.log.debug('Wait for layers to load');
    await this.retry.try(async () => {
      const tableOfContents = await this.testSubjects.find('mapLayerTOC');
      await tableOfContents.waitForDeletedByCssSelector('.euiLoadingSpinner');
    });
  }

  async waitForLayersToLoadMinimizedLayerControl() {
    this.log.debug('Wait for layers to load (minimized layer control)');
    await this.retry.try(async () => {
      const tableOfContents = await this.testSubjects.find('mapExpandLayerControlButton');
      await tableOfContents.waitForDeletedByCssSelector('.euiLoadingSpinner');
    });
  }

  async waitForLayerDeleted(layerName: string) {
    this.log.debug('Wait for layer deleted');
    await this.retry.waitFor('Layer to be deleted', async () => {
      const doesLayerExist = await this.doesLayerExist(layerName);
      return !doesLayerExist;
    });
  }

  // use the search filter box to narrow the results down to a single
  // entry, or at least to a single page of results
  async loadSavedMap(name: string) {
    this.log.debug(`Load Saved Map ${name}`);

    await this.retry.try(async () => {
      await this.searchForMapWithName(name);
      await this.listingTable.clickItemLink('map', name);
      await this.header.waitUntilLoadingHasFinished();
      // check Map landing page is not present
      await this.testSubjects.missingOrFail('mapLandingPage', { timeout: 10000 });
    });

    await this.waitForLayersToLoad();
  }

  async deleteSavedMaps(search: string) {
    await this.searchForMapWithName(search);
    await this.listingTable.checkListingSelectAllCheckbox();
    await this.listingTable.clickDeleteSelected();
    await this.common.clickConfirmOnModal();

    await this.header.waitUntilLoadingHasFinished();
  }

  async openNewMap() {
    this.log.debug(`Open new Map`);

    // Navigate directly because we don't need to go through the map listing
    // page. The listing page is skipped if there are no saved objects
    await this.common.navigateToUrlWithBrowserHistory(APP_ID, '/map');
    await this.renderable.waitForRender();
  }

  async saveMap(name: string, redirectToOrigin = true, saveAsNew = true, tags?: string[]) {
    await this.testSubjects.click('mapSaveButton');
    await this.testSubjects.setValue('savedObjectTitle', name);
    await this.visualize.setSaveModalValues(name, {
      addToDashboard: false,
      redirectToOrigin,
      saveAsNew,
    });
    if (tags) {
      await this.testSubjects.click('savedObjectTagSelector');
      for (const tagName of tags) {
        await this.testSubjects.click(`tagSelectorOption-${tagName.replace(' ', '_')}`);
      }
      await this.testSubjects.click('savedObjectTitle');
    }
    await this.testSubjects.clickWhenNotDisabled('confirmSaveSavedObjectButton');
    await this.header.waitUntilLoadingHasFinished();
  }

  async clickSaveAndReturnButton() {
    await this.testSubjects.click('mapSaveAndReturnButton');
  }

  async expectMissingSaveAndReturnButton() {
    await this.testSubjects.missingOrFail('mapSaveAndReturnButton');
  }

  async expectMissingSaveButton() {
    await this.testSubjects.missingOrFail('mapSaveButton');
  }

  async expectMissingCreateNewButton() {
    await this.testSubjects.missingOrFail('newItemButton');
  }

  async expectMissingAddLayerButton() {
    await this.testSubjects.missingOrFail('addLayerButton');
  }

  async expectExistAddLayerButton() {
    await this.testSubjects.existOrFail('addLayerButton');
  }

  async onMapListingPage() {
    this.log.debug(`onMapListingPage`);
    return await this.listingTable.onListingPage('map');
  }

  async onMapPage() {
    this.log.debug(`onMapPage`);
    return await this.testSubjects.exists('mapLayerTOC', {
      timeout: 5000,
    });
  }

  async searchForMapWithName(name: string) {
    this.log.debug(`searchForMapWithName: ${name}`);

    await this.gotoMapListingPage();

    await this.listingTable.searchForItemWithName(name);

    await this.header.waitUntilLoadingHasFinished();
  }

  async getHits() {
    await this.inspector.open();
    await this.inspector.openInspectorRequestsView();
    const requestStats = await this.inspector.getTableData();
    const hits = this.getInspectorStatRowHit(requestStats, 'Hits');
    await this.inspector.close();
    return hits;
  }

  async gotoMapListingPage() {
    this.log.debug('gotoMapListingPage');
    const onPage = await this.onMapListingPage();
    if (!onPage) {
      await this.retry.try(async () => {
        await this.common.navigateToUrlWithBrowserHistory(APP_ID, '/');
        const onMapListingPage = await this.onMapListingPage();
        if (!onMapListingPage) throw new Error('Not on map listing page.');
      });
    }
  }

  async searchAndExpectItemsCount(name: string, count: number) {
    await this.gotoMapListingPage();

    this.log.debug(`searchAndExpectItemsCount: ${name}`);
    await this.listingTable.searchAndExpectItemsCount('map', name, count);
  }

  async setView(lat: number, lon: number, zoom: number) {
    this.log.debug(
      `Set view lat: ${lat.toString()}, lon: ${lon.toString()}, zoom: ${zoom.toString()}`
    );
    await this.setViewPopoverToggle.open();
    await this.testSubjects.setValue('latitudeInput', lat.toString());
    await this.testSubjects.setValue('longitudeInput', lon.toString());
    await this.testSubjects.setValue('zoomInput', zoom.toString());
    await this.testSubjects.click('submitViewButton');
    await this.waitForMapPanAndZoom();
  }

  async getView() {
    this.log.debug('Get view');
    await this.setViewPopoverToggle.open();
    // this method is regularly called within a retry, so we need to reduce the timeouts
    // of the retries done within the getAttribute method in order to ensure that they fail
    // early enough to retry getView()
    const getAttributeOptions = {
      tryTimeout: 5000,
      findTimeout: 1000,
    };

    const lat = await this.testSubjects.getAttribute('latitudeInput', 'value', getAttributeOptions);
    const lon = await this.testSubjects.getAttribute(
      'longitudeInput',
      'value',
      getAttributeOptions
    );
    const zoom = await this.testSubjects.getAttribute('zoomInput', 'value', getAttributeOptions);

    await this.setViewPopoverToggle.close();
    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      zoom: parseFloat(zoom),
    };
  }

  async toggleLayerVisibility(layerName: string) {
    this.log.debug(`Toggle layer visibility, layer: ${layerName}`);
    await this.openLayerTocActionsPanel(layerName);
    await this.testSubjects.click('layerVisibilityToggleButton');
  }

  async toggleLayerVisibilityRoadMap() {
    const isRoadMapDesaturated = await this.testSubjects.exists(
      'layerTocActionsPanelToggleButtonRoad_map_-_desaturated'
    );
    const isRoadMap = await this.testSubjects.exists('layerTocActionsPanelToggleButtonRoad_map');
    if (!isRoadMapDesaturated && !isRoadMap) {
      throw new Error('Layer road map not found');
    }
    if (isRoadMapDesaturated) {
      await this.toggleLayerVisibility('Road map - desaturated');
    }
    if (isRoadMap) {
      await this.toggleLayerVisibility('Road map');
    }
  }

  async toggleLayerVisibilityTotalRequests() {
    const isRequestByCountry = await this.testSubjects.exists(
      'layerTocActionsPanelToggleButtonTotal_Requests_by_Country'
    );
    const isRequestByDestination = await this.testSubjects.exists(
      'layerTocActionsPanelToggleButtonTotal_Requests_by_Destination'
    );
    if (!isRequestByCountry && !isRequestByDestination) {
      throw new Error('Layer total requests not found');
    }
    if (isRequestByCountry) {
      await this.toggleLayerVisibility('Total Requests by Country');
    }
    if (isRequestByDestination) {
      await this.toggleLayerVisibility('Total Requests by Destination');
    }
  }

  async openLegend() {
    const isOpen = await this.testSubjects.exists('mapLayerTOC');
    if (isOpen === false) {
      await this.testSubjects.click('mapExpandLayerControlButton');
      await this.testSubjects.existOrFail('mapLayerTOC');
    }
  }

  async closeLegend() {
    const isOpen = await this.testSubjects.exists('mapLayerTOC');
    if (isOpen) {
      await this.testSubjects.click('mapToggleLegendButton');
      await this.testSubjects.waitForDeleted('mapLayerTOC');
    }
  }

  async clickFitToData() {
    this.log.debug('Fit to data');
    await this.testSubjects.click('fitToData');
    await this.waitForMapPanAndZoom();
  }

  async clickFitToBounds(layerName: string) {
    this.log.debug(`Fit to bounds, layer: ${layerName}`);
    const origView = await this.getView();
    await this.openLayerTocActionsPanel(layerName);
    await this.testSubjects.click('fitToBoundsButton');
    await this.waitForMapPanAndZoom(origView);
  }

  async openLayerTocActionsPanel(layerName: string) {
    const escapedDisplayName = escapeLayerName(layerName);
    const isOpen = await this.testSubjects.exists(`layerTocActionsPanel${escapedDisplayName}`);
    if (!isOpen) {
      await this.testSubjects.click(`layerTocActionsPanelToggleButton${escapedDisplayName}`);
    }
  }

  async getLayerTocTooltipMsg(layerName: string) {
    const escapedDisplayName = escapeLayerName(layerName);
    await this.retry.try(async () => {
      await this.testSubjects.moveMouseTo(`layerTocActionsPanelToggleButton${escapedDisplayName}`);
      const isOpen = await this.testSubjects.exists(`layerTocTooltip`, { timeout: 5000 });
      if (!isOpen) {
        throw new Error('layer TOC tooltip not open');
      }
    });
    return await this.testSubjects.getVisibleText('layerTocTooltip');
  }

  async openLayerPanel(layerName: string) {
    this.log.debug(`Open layer panel, layer: ${layerName}`);
    await this.openLayerTocActionsPanel(layerName);
    await this.testSubjects.click('layerSettingsButton');
  }

  async closeLayerPanel() {
    await this.testSubjects.click('layerPanelCancelButton');
    await this.waitForLayersToLoad();
  }

  async getLayerTOCDetails(layerName: string) {
    return await this.testSubjects.getVisibleText(
      `mapLayerTOCDetails${escapeLayerName(layerName)}`
    );
  }

  async disableApplyGlobalQuery() {
    const isSelected = await this.testSubjects.getAttribute(
      'mapLayerPanelApplyGlobalQueryCheckbox',
      'aria-checked'
    );
    if (isSelected === 'true') {
      await this.retry.try(async () => {
        this.log.debug(`disabling applyGlobalQuery`);
        await this.testSubjects.click('mapLayerPanelApplyGlobalQueryCheckbox');
        const isStillSelected = await this.testSubjects.getAttribute(
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

  async getNumberOfLayers() {
    const tocEntries = await this.find.allByCssSelector('.mapTocEntry');
    return tocEntries.length;
  }

  async doesLayerExist(layerName: string) {
    return await this.testSubjects.exists(
      `layerTocActionsPanelToggleButton${escapeLayerName(layerName)}`
    );
  }

  /*
   * Layer panel utility functions
   */
  async isLayerAddPanelOpen() {
    this.log.debug(`Is layer add panel open`);
    return await this.testSubjects.exists('layerAddForm');
  }

  async waitForLayerAddPanelClosed() {
    let layerAddPanelOpen = false;
    await this.retry.waitForWithTimeout('Layer add panel closed', 1000, async () => {
      layerAddPanelOpen = await this.isLayerAddPanelOpen();
      return !layerAddPanelOpen;
    });
  }

  async clickAddLayer() {
    this.log.debug('Click add layer');
    await this.retry.try(async () => {
      await this.testSubjects.click('addLayerButton');
      const isOpen = await this.isLayerAddPanelOpen();
      if (!isOpen) {
        throw new Error('Add layer panel still not open, trying again.');
      }
    });
  }

  async cancelLayerAdd(layerName: string) {
    this.log.debug(`Cancel layer add`);
    const cancelExists = await this.testSubjects.exists('layerAddCancelButton');
    if (cancelExists) {
      await this.testSubjects.click('layerAddCancelButton');
      await this.waitForLayerAddPanelClosed();
      if (layerName) {
        await this.waitForLayerDeleted(layerName);
      }
    }
  }

  async closeOrCancelLayer(layerName: string) {
    this.log.debug(`Close or cancel layer add`);
    const cancelExists = await this.testSubjects.exists('layerAddCancelButton');
    const closeExists = await this.testSubjects.exists('layerPanelCancelButton');
    if (cancelExists) {
      this.log.debug(`Cancel layer add.`);
      await this.testSubjects.click('layerAddCancelButton');
    } else if (closeExists) {
      this.log.debug(`Close layer add.`);
      await this.testSubjects.click('layerPanelCancelButton');
    } else {
      this.log.debug(`No need to close or cancel.`);
      return;
    }

    await this.waitForLayerAddPanelClosed();
    if (layerName) {
      await this.waitForLayerDeleted(layerName);
    }
  }

  async setLayerQuery(layerName: string, query: string) {
    await this.openLayerPanel(layerName);
    await this.testSubjects.click('mapLayerPanelOpenFilterEditorButton');
    const filterEditorContainer = await this.testSubjects.find('mapFilterEditor');
    const queryBarInFilterEditor = await this.testSubjects.findDescendant(
      'queryInput',
      filterEditorContainer
    );
    await queryBarInFilterEditor.click();
    const input = await this.find.activeElement();
    await this.retry.try(async () => {
      await input.clearValue();
      await input.type(query);
      const value = await input.getAttribute('value');
      if (value !== query) {
        throw new Error(`Layer query set to ${value} instead of ${query}`);
      }
    });
    await this.testSubjects.click('mapFilterEditorSubmitButton');
    await this.waitForLayersToLoad();
  }

  async setJoinWhereQuery(layerName: string, query: string) {
    await this.openLayerPanel(layerName);
    await this.testSubjects.click('mapJoinWhereExpressionButton');
    const filterEditorContainer = await this.testSubjects.find('mapJoinWhereFilterEditor');
    const queryBarInFilterEditor = await this.testSubjects.findDescendant(
      'queryInput',
      filterEditorContainer
    );
    await queryBarInFilterEditor.click();
    const input = await this.find.activeElement();
    await input.clearValue();
    await input.type(query);
    await this.testSubjects.click('mapWhereFilterEditorSubmitButton');
    await this.waitForLayersToLoad();
  }

  async selectDocumentsSource() {
    this.log.debug(`Select Documents source`);
    await this.testSubjects.click('documents');
  }

  async selectGeoIndexPatternLayer(name: string) {
    this.log.debug(`Select index pattern ${name}`);
    await this.comboBox.set('mapGeoIndexPatternSelect', name);
    await this.waitForLayersToLoad();
  }

  async selectEMSBoundariesSource() {
    this.log.debug(`Select Elastic Maps Service boundaries source`);
    await this.testSubjects.click('emsBoundaries');
  }

  async selectFileUploadCard() {
    this.log.debug(`Select upload file card`);
    await this.testSubjects.click('uploadFile');
  }

  async selectVectorLayer(vectorLayerName: string) {
    this.log.debug(`Select EMS vector layer ${vectorLayerName}`);
    if (!vectorLayerName) {
      throw new Error(`You did not provide the EMS layer to select`);
    }
    await this.comboBox.set('emsVectorComboBox', vectorLayerName);
    await this.waitForLayersToLoad();
  }

  async removeLayer(layerName: string) {
    this.log.debug(`Remove layer ${layerName}`);
    await this.openLayerPanel(layerName);
    await this.testSubjects.click(`mapRemoveLayerButton`);
    await this.waitForLayerDeleted(layerName);
  }

  async getLayerErrorText(layerName: string) {
    this.log.debug(`Remove layer ${layerName}`);
    await this.openLayerPanel(layerName);
    return await this.testSubjects.getVisibleText(`layerErrorMessage`);
  }

  async fullScreenModeMenuItemExists() {
    return await this.testSubjects.exists('mapsFullScreenMode');
  }

  async clickFullScreenMode() {
    this.log.debug(`clickFullScreenMode`);
    await this.testSubjects.click('mapsFullScreenMode');
  }

  async exitFullScreenLogoButtonExists() {
    return await this.testSubjects.exists('exitFullScreenModeLogo');
  }

  async getExitFullScreenLogoButton() {
    return await this.testSubjects.find('exitFullScreenModeLogo');
  }

  async clickExitFullScreenTextButton() {
    await this.testSubjects.click('exitFullScreenModeText');
  }

  async openInspectorMapView() {
    await this.inspector.openInspectorView('~inspectorViewChooserMap');
  }

  // Method should only be used when multiple requests are expected
  // RequestSelector will only display inspectorRequestChooser when there is more than one request
  async openInspectorRequest(requestName: string) {
    await this.inspector.open();
    await this.inspector.openInspectorRequestsView();
    this.log.debug(`Open Inspector request ${requestName}`);
    await this.testSubjects.click('inspectorRequestChooser');
    await this.testSubjects.click(`inspectorRequestChooser${requestName}`);
  }

  async doesInspectorHaveRequests() {
    await this.inspector.open();
    await this.inspector.openInspectorRequestsView();
    return await this.testSubjects.exists('inspectorNoRequestsMessage');
  }

  async getMapboxStyle() {
    this.log.debug('getMapboxStyle');
    await this.inspector.open();
    await this.openInspectorMapView();
    await this.testSubjects.click('mapboxStyleTab');
    const mapboxStyleContainer = await this.testSubjects.find('mapboxStyleContainer');
    const mapboxStyleJson = await mapboxStyleContainer.getVisibleText();
    await this.inspector.close();
    let mapboxStyle;
    try {
      mapboxStyle = JSON.parse(mapboxStyleJson);
    } catch (err) {
      throw new Error(`Unable to parse mapbox style, error: ${err.message}`);
    }
    return mapboxStyle;
  }

  async getResponse(requestName: string) {
    await this.inspector.open();
    const response = await this._getResponse(requestName);
    await this.inspector.close();
    return response;
  }

  async _getResponse(requestName: string) {
    if (requestName) {
      await this.testSubjects.click('inspectorRequestChooser');
      await this.testSubjects.click(`inspectorRequestChooser${requestName}`);
    }
    await this.inspector.openInspectorRequestsView();
    await this.testSubjects.click('inspectorRequestDetailResponse');
    await this.find.byCssSelector('.react-monaco-editor-container');
    const responseBody = await this.monacoEditor.getCodeEditorValue();
    return JSON.parse(responseBody);
  }

  async getResponseFromDashboardPanel(panelTitle: string, requestName: string) {
    await this.dashboardPanelActions.openInspectorByTitle(panelTitle);
    const response = await this._getResponse(requestName);
    await this.inspector.close();
    return response;
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
    this.log.debug(`triggerSingleRefresh, refreshInterval: ${refreshInterval}`);
    await this.timePicker.resumeAutoRefresh();
    this.log.debug('waiting to give time for refresh timer to fire');
    await this.common.sleep(refreshInterval + refreshInterval / 2);
    await this.timePicker.pauseAutoRefresh();
    await this.waitForLayersToLoad();
  }

  async lockTooltipAtPosition(xOffset: number, yOffset: number) {
    await this.retry.try(async () => {
      const mapContainerElement = await this.testSubjects.find('mapContainer');
      await mapContainerElement.moveMouseTo({ xOffset, yOffset });
      await mapContainerElement.clickMouseButton({ xOffset, yOffset });
      // Close button is only displayed with tooltip is locked
      const hasCloseButton = await this.testSubjects.exists('mapTooltipCloseButton');
      if (!hasCloseButton) {
        throw new Error('Tooltip is not locked at position');
      }
    });
  }

  async setStyleByValue(styleName: string, fieldName: string) {
    await this.testSubjects.selectValue(`staticDynamicSelect_${styleName}`, 'DYNAMIC');
    await this.comboBox.set(`styleFieldSelect_${styleName}`, fieldName);
  }

  async selectCustomColorRamp(styleName: string) {
    // open super select menu
    await this.testSubjects.click(`colorMapSelect_${styleName}`);
    // Click option
    await this.testSubjects.click(`colorMapSelectOption_CUSTOM_COLOR_MAP`);
  }

  async getCategorySuggestions() {
    return await this.comboBox.getOptionsList(`colorStopInput1`);
  }

  async enableAutoFitToBounds() {
    await this.testSubjects.click('openSettingsButton');
    const isEnabled = await this.testSubjects.getAttribute('autoFitToDataBoundsSwitch', 'checked');
    if (!isEnabled) {
      await this.retry.try(async () => {
        await this.testSubjects.click('autoFitToDataBoundsSwitch');
        const ensureEnabled = await this.testSubjects.getAttribute(
          'autoFitToDataBoundsSwitch',
          'checked'
        );
        if (!ensureEnabled) {
          throw new Error('autoFitToDataBoundsSwitch is not enabled');
        }
      });
    }
    await this.testSubjects.click('mapSettingSubmitButton');
  }

  async refreshAndClearUnsavedChangesWarning() {
    await this.browser.refresh();
    // accept alert if it pops up
    const alert = await this.browser.getAlert();
    await alert?.accept();
  }
}
