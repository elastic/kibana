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
    async loadSavedWorkspace(name) {
      log.debug(`Load Saved Workspace ${name}`);

      await this.gotoWorkspaceListingPage();

      await retry.try(async () => {
        await this.searchForWorkspaceWithName(name);
        await this.selectWorkspace(name);
        await PageObjects.header.waitUntilLoadingHasFinished();

        const onWorkspaceListingPage = await this.onWorkspaceListingPage();
        if (onWorkspaceListingPage) {
          throw new Error(`Failed to open workspace ${name}`);
        }
      });
    }

    async onWorkspaceListingPage() {
      log.debug(`onWorkspaceListingPage`);
      const exists = await testSubjects.exists('gisListingPage');
      return exists;
    }

    async searchForWorkspaceWithName(name) {
      log.debug(`searchForWorkspaceWithName: ${name}`);

      await this.gotoWorkspaceListingPage();

      await retry.try(async () => {
        const searchFilter = await testSubjects.find('searchFilter');
        await searchFilter.clearValue();
        await searchFilter.click();
        await PageObjects.common.pressEnterKey();
      });

      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async selectWorkspace(name) {
      await testSubjects.click(`workspaceListingTitleLink-${name.split(' ').join('-')}`);
    }

    async gotoWorkspaceListingPage() {
      log.debug('gotoWorkspaceListingPage');
      const onPage = await this.onWorkspaceListingPage();
      if (!onPage) {
        await retry.try(async () => {
          await PageObjects.common.navigateToUrl('gis', '/');
          const onWorkspaceListingPage = await this.onWorkspaceListingPage();
          if (!onWorkspaceListingPage) throw new Error('Not on workspace listing page.');
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
      await this.openInspector();
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
