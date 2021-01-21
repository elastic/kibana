/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SearchSessionsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async goTo() {
      await PageObjects.common.navigateToApp('management/kibana/search_sessions');
    },

    async refresh() {
      await testSubjects.click('sessionManagementRefreshBtn');
    },

    async getList() {
      const table = await find.byCssSelector('table');
      const allRows = await table.findAllByTestSubject('searchSessionsRow');

      return Promise.all(
        allRows.map(async (row) => {
          const $ = await row.parseDomContent();
          const viewCell = await row.findByTestSubject('sessionManagementNameCol');
          const actionsCell = await row.findByTestSubject('sessionManagementActionsCol');
          return {
            name: $.findTestSubject('sessionManagementNameCol').text(),
            status: $.findTestSubject('sessionManagementStatusLabel').attr('data-test-status'),
            mainUrl: $.findTestSubject('sessionManagementNameCol').text(),
            created: $.findTestSubject('sessionManagementCreatedCol').text(),
            expires: $.findTestSubject('sessionManagementExpiresCol').text(),
            app: $.findTestSubject('sessionManagementAppIcon').attr('data-test-app-id'),
            view: async () => {
              await viewCell.click();
            },
            reload: async () => {
              await actionsCell.click();
              await find.clickByCssSelector(
                '[data-test-subj="sessionManagementPopoverAction-reload"]'
              );
            },
            cancel: async () => {
              await actionsCell.click();
              await find.clickByCssSelector(
                '[data-test-subj="sessionManagementPopoverAction-cancel"]'
              );
              await PageObjects.common.clickConfirmOnModal();
            },
          };
        })
      );
    },
  };
}
