/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function GisPageProvider({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'header']);

  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const flyout = getService('flyout');

  class GisPage {

    // use the search filter box to narrow the results down to a single
    // entry, or at least to a single page of results
    async loadSavedMap(name) {
      log.debug(`Load Saved Map ${name}`);

      await this.gotoMapListingPage();

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

    async onMapListingPage() {
      log.debug(`onMapListingPage`);
      const exists = await testSubjects.exists('gisListingPage');
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
          await PageObjects.common.navigateToUrl('gis', '/');
          const onMapListingPage = await this.onMapListingPage();
          if (!onMapListingPage) throw new Error('Not on map listing page.');
        });
      }
    }

    async openInspector() {
      log.debug('Open Inspector');
      const isOpen = await testSubjects.exists('inspectorPanel');
      if (!isOpen) {
        await retry.try(async () => {
          await testSubjects.click('openInspectorButton');
          await testSubjects.find('inspectorPanel');
        });
      }
    }

    async closeInspector() {
      log.debug('Close Inspector');
      let isOpen = await testSubjects.exists('inspectorPanel');
      if (isOpen) {
        await retry.try(async () => {
          await flyout.close('inspectorPanel');
          isOpen = await testSubjects.exists('inspectorPanel');
          if (isOpen) {
            throw new Error('Failed to close inspector');
          }
        });
      }
    }

    async openInspectorView(viewId) {
      await this.openInspector();
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

    async getMapboxStyle() {
      log.debug('getMapboxStyle');
      await this.openInspectorMapView();
      await testSubjects.click('mapboxStyleTab');
      const mapboxStyleContainer = await testSubjects.find('mapboxStyleContainer');
      const mapboxStyleJson = await mapboxStyleContainer.getVisibleText();
      let mapboxStyle;
      try {
        mapboxStyle = JSON.parse(mapboxStyleJson);
      } catch(err) {
        throw new Error(`Unable to parse mapbox style, error: ${err.message}`);
      }
      return mapboxStyle;
    }

    async getInspectorTableData() {
      const inspectorPanel = await testSubjects.find('inspectorPanel');
      const tableBody = await retry.try(async () => inspectorPanel.findByTagName('tbody'));
      // Convert the data into a nested array format:
      // [ [cell1_in_row1, cell2_in_row1], [cell1_in_row2, cell2_in_row2] ]
      const rows = await tableBody.findAllByTagName('tr');
      return await Promise.all(rows.map(async row => {
        const cells = await row.findAllByTagName('td');
        return await Promise.all(cells.map(async cell => cell.getVisibleText()));
      }));
    }

    async getInspectorRequestStat(statName) {
      await this.openInspectorRequestsView();
      const requestStats = await this.getInspectorTableData();
      return this._getInspectorStatRowHit(requestStats, statName);
    }

    _getInspectorStatRowHit(stats, rowName) {
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

  }
  return new GisPage();
}
