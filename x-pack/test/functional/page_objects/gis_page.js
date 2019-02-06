/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function GisPageProvider({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'header', 'timePicker']);

  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const inspector = getService('inspector');
  const find = getService('find');

  class GisPage {

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

    async waitForLayersToLoad() {
      log.debug('Wait for layers to load');
      const tableOfContents = await testSubjects.find('mapLayerTOC');
      await retry.try(async () => {
        await tableOfContents.waitForDeletedByClassName('euiLoadingSpinner');
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

    async gotoMapListingPage() {
      log.debug('gotoMapListingPage');
      const onPage = await this.onMapListingPage();
      if (!onPage) {
        await retry.try(async () => {
          await PageObjects.common.navigateToUrl('maps', '/');
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

    /*
     * Layer TOC (table to contents) utility functions
     */
    async setView(lat, lon, zoom) {
      log.debug(`Set view lat: ${lat.toString()}, lon: ${lon.toString()}, zoom: ${zoom.toString()}`);
      await testSubjects.click('toggleSetViewVisibilityButton');
      await testSubjects.setValue('latitudeInput', lat.toString());
      await testSubjects.setValue('longitudeInput', lon.toString());
      await testSubjects.setValue('zoomInput', zoom.toString());
      await testSubjects.click('submitViewButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getView() {
      log.debug('Get view');
      await testSubjects.click('toggleSetViewVisibilityButton');
      const lat = await testSubjects.getAttribute('latitudeInput', 'value');
      const lon = await testSubjects.getAttribute('longitudeInput', 'value');
      const zoom = await testSubjects.getAttribute('zoomInput', 'value');
      await testSubjects.click('toggleSetViewVisibilityButton');
      return { lat, lon, zoom };
    }

    async toggleLayerVisibility(layerName) {
      log.debug(`Toggle layer visibility, layer: ${layerName}`);
      await this.openLayerTocActionsPanel(layerName);
      await testSubjects.click('layerVisibilityToggleButton');
    }

    async openLayerTocActionsPanel(layerName) {
      const cleanLayerName = layerName.split(' ').join('');
      const isOpen = await testSubjects.exists(`layerTocActionsPanel${cleanLayerName}`);
      if (!isOpen) {
        await testSubjects.click(`layerTocActionsPanelToggleButton${cleanLayerName}`);
      }
    }

    async openLayerPanel(layerName) {
      log.debug(`Open layer panel, layer: ${layerName}`);
      await testSubjects.click(`mapOpenLayerButton${layerName}`);
    }

    async doesLayerExist(layerName) {
      log.debug(`Open layer panel, layer: ${layerName}`);
      return await testSubjects.exists(`mapOpenLayerButton${layerName}`);
    }

    /*
     * Layer panel utility functions
     */
    async removeLayer(layerName) {
      log.debug(`Remove layer ${layerName}`);
      await this.openLayerPanel(layerName);
      await testSubjects.click(`mapRemoveLayerButton`);
    }

    async getLayerErrorText(layerName) {
      log.debug(`Remove layer ${layerName}`);
      await this.openLayerPanel(layerName);
      return await testSubjects.getVisibleText(`layerErrorMessage`);
    }

    async openInspectorView(viewId) {
      await inspector.open();
      log.debug(`Open Inspector view ${viewId}`);
      await testSubjects.click('inspectorViewChooser');
      await testSubjects.click(viewId);
    }

    async openInspectorMapView() {
      await this.openInspectorView('inspectorViewChooserMap');
    }

    async openInspectorRequestsView() {
      await this.openInspectorView('inspectorViewChooserRequests');
    }

    // Method should only be used when multiple requests are expected
    // RequestSelector will only display inspectorRequestChooser when there is more than one request
    async openInspectorRequest(requestName) {
      await this.openInspectorView('inspectorViewChooserRequests');
      log.debug(`Open Inspector request ${requestName}`);
      await testSubjects.click('inspectorRequestChooser');
      await testSubjects.click(`inspectorRequestChooser${requestName}`);
    }

    async doesInspectorHaveRequests() {
      await this.openInspectorRequestsView();
      return await testSubjects.exists('inspectorNoRequestsMessage');
    }

    async getMapboxStyle() {
      log.debug('getMapboxStyle');
      await this.openInspectorMapView();
      await testSubjects.click('mapboxStyleTab');
      const mapboxStyleContainer = await testSubjects.find('mapboxStyleContainer');
      const mapboxStyleJson = await mapboxStyleContainer.getVisibleText();
      await inspector.close();
      let mapboxStyle;
      try {
        mapboxStyle = JSON.parse(mapboxStyleJson);
      } catch(err) {
        throw new Error(`Unable to parse mapbox style, error: ${err.message}`);
      }
      return mapboxStyle;
    }

    getInspectorStatRowHit(stats, rowName) {
      const STATS_ROW_NAME_INDEX = 0;
      const STATS_ROW_VALUE_INDEX = 1;

      const statsRow = stats.find((statsRow) => {
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
      await PageObjects.common.sleep(refreshInterval + (refreshInterval / 2));
      await PageObjects.timePicker.pauseAutoRefresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
    }
  }
  return new GisPage();
}
