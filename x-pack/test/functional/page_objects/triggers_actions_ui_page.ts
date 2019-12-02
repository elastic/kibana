/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function TriggersActionsPageProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return {
    async sectionHeadingText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async selectActionTypeFilter() {
      await testSubjects.click('typeFilterButton');
    },
    async typeFilterButton() {
      return await testSubjects.find('typeFilterButton');
    },
    async createActionConnector() {
      await testSubjects.click('createActionButton');
    },

    async getActionConnectorsList() {
      const table = await find.byCssSelector('table');
      const $ = await table.parseDomContent();
      return $.findTestSubjects('connectors-row')
        .toArray()
        .map(row => {
          return {
            indexHealth: $(row)
              .findTestSubject('cell-actionType')
              .text(),
            indexStatus: $(row)
              .findTestSubject('cell-description')
              .text(),
            indexPrimary: $(row)
              .findTestSubject('cell-referencedByCount')
              .text(),
          };
        });
    },
    async changeTabs(tab: 'alertsTab' | 'connectorsTab') {
      return await testSubjects.click(tab);
    },
  };
}
