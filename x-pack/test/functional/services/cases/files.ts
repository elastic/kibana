/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesFilesTableServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  const assertFileExists = (index: number, totalFiles: number) => {
    if (index > totalFiles - 1) {
      throw new Error('Cannot get file from table. Index is greater than the length of all rows');
    }
  };

  return {
    async addFile(fileInputPath: string) {
      // click the AddFile button
      await testSubjects.click('cases-files-add');
      await find.byCssSelector('[aria-label="Upload a file"]');

      // upload a file
      await common.setFileInputPath(fileInputPath);
      await testSubjects.click('uploadButton');
    },

    async searchByFileName(fileName: string) {
      const searchField = await testSubjects.find('cases-files-search');

      searchField.clearValue();

      await searchField.type(fileName);
      await searchField.pressKeys(browser.keys.ENTER);
    },

    async deleteFile(index: number = 0) {
      const row = await this.getFileByIndex(index);

      (await row.findByCssSelector('[data-test-subj="cases-files-delete-button"]')).click();

      await testSubjects.click('confirmModalConfirmButton');
    },

    async openFilePreview(index: number = 0) {
      const row = await this.getFileByIndex(index);

      (await row.findByCssSelector('[data-test-subj="cases-files-name-link"]')).click();
    },

    async emptyOrFail() {
      await testSubjects.existOrFail('cases-files-table-empty');
    },

    async getFileByIndex(index: number) {
      const rows = await find.allByCssSelector('[data-test-subj*="cases-files-table-row-"', 100);

      assertFileExists(index, rows.length);

      return rows[index] ?? null;
    },
  };
}
