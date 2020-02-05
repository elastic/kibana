/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IndexManagementPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

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

    async getIndexList() {
      const table = await find.byCssSelector('table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('indexTableRow')
        .toArray()
        .map(row => {
          return {
            indexName: $(row)
              .findTestSubject('indexTableIndexNameLink')
              .text(),
            indexHealth: $(row)
              .findTestSubject('indexTableCell-health')
              .text(),
            indexStatus: $(row)
              .findTestSubject('indexTableCell-status')
              .text(),
            indexPrimary: $(row)
              .findTestSubject('indexTableCell-primary')
              .text(),
            indexReplicas: $(row)
              .findTestSubject('indexTableCell-replica')
              .text(),
            indexDocuments: $(row)
              .findTestSubject('indexTableCell-documents')
              .text()
              .replace('documents', ''),
            indexSize: $(row)
              .findTestSubject('indexTableCell-size')
              .text(),
          };
        });
    },
    async changeTabs(tab: 'indicesTab' | 'templatesTab') {
      return await testSubjects.click(tab);
    },
  };
}
