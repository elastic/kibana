/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SEARCH_SESSIONS_TABLE_ID } from '@kbn/data-plugin/common';
import { FtrProviderContext } from '../ftr_provider_context';

export function SearchSessionsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
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
      const table = await testSubjects.find(SEARCH_SESSIONS_TABLE_ID);
      const allRows = await table.findAllByTestSubject('searchSessionsRow');

      return Promise.all(
        allRows.map(async (row) => {
          const $ = await row.parseDomContent();
          const viewCell = await row.findByTestSubject('sessionManagementNameCol');
          const actionsCell = await row.findByTestSubject('sessionManagementActionsCol');

          return {
            id: (await row.getAttribute('data-test-search-session-id')).split('id-')[1],
            name: $.findTestSubject('sessionManagementNameCol').text().trim(),
            status: $.findTestSubject('sessionManagementStatusLabel').attr('data-test-status'),
            mainUrl: $.findTestSubject('sessionManagementNameCol').text(),
            created: $.findTestSubject('sessionManagementCreatedCol').text(),
            expires: $.findTestSubject('sessionManagementExpiresCol').text(),
            searchesCount: Number($.findTestSubject('sessionManagementNumSearchesCol').text()),
            app: $.findTestSubject('sessionManagementAppIcon').attr('data-test-app-id'),
            view: async () => {
              log.debug('management ui: view the session');
              await viewCell.click();
            },
            reload: async () => {
              log.debug('management ui: reload the status');
              await actionsCell.click();
              await testSubjects.click('sessionManagementPopoverAction-reload');
            },
            delete: async () => {
              log.debug('management ui: delete the session');
              await actionsCell.click();
              await find.clickByCssSelector(
                '[data-test-subj="sessionManagementPopoverAction-delete"]'
              );
              await PageObjects.common.clickConfirmOnModal();
            },
          };
        })
      );
    },
  };
}
