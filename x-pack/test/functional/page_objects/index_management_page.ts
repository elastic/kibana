/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IndexManagementPageProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async reloadIndices() {
      await testSubjects.click('reloadIndicesButton');
    },
    async reloadIndicesButton() {
      return await testSubjects.find('reloadIndicesButton');
    },
    async toggleRollupIndices() {
      await testSubjects.click('checkboxToggles-rollupToggle');
    },

    async clickDetailPanelTabAt(indexOfTab: number): Promise<void> {
      const tabList = await testSubjects.findAll('detailPanelTab');
      log.debug(tabList.length);
      await tabList[indexOfTab].click();
    },

    async clickIndiceAt(indexOfRow: number): Promise<void> {
      const indexList = await testSubjects.findAll('indexTableIndexNameLink');
      await indexList[indexOfRow].click();
      await retry.waitFor('detail panel title to show up', async () => {
        return (await testSubjects.isDisplayed('detailPanelTabSelected')) === true;
      });
    },

    async performIndexActionInDetailPanel(action: string) {
      await this.clickContextMenuInDetailPanel();
      if (action === 'flush') {
        await testSubjects.click('flushIndexMenuButton');
      }
    },

    async clickContextMenuInDetailPanel() {
      await testSubjects.click('indexActionsContextMenuButton');
    },

    async getIndexList() {
      const table = await find.byCssSelector('table');
      const rows = await table.findAllByTestSubject('indexTableRow');
      return await Promise.all(
        rows.map(async (row) => {
          return {
            indexLink: await row.findByTestSubject('indexTableIndexNameLink'),
            indexName: await (
              await row.findByTestSubject('indexTableIndexNameLink')
            ).getVisibleText(),
            indexHealth: await (
              await row.findByTestSubject('indexTableCell-health')
            ).getVisibleText(),
            indexStatus: await (
              await row.findByTestSubject('indexTableCell-status')
            ).getVisibleText(),
            indexPrimary: await (
              await row.findByTestSubject('indexTableCell-primary')
            ).getVisibleText(),
            indexReplicas: await (
              await row.findByTestSubject('indexTableCell-replica')
            ).getVisibleText(),
            indexDocuments: await (
              await (await row.findByTestSubject('indexTableCell-documents')).getVisibleText()
            ).replace('documents', ''),
            indexSize: await (await row.findByTestSubject('indexTableCell-size')).getVisibleText(),
          };
        })
      );
    },

    async changeTabs(
      tab: 'indicesTab' | 'data_streamsTab' | 'templatesTab' | 'component_templatesTab'
    ) {
      await testSubjects.click(tab);
    },
  };
}
