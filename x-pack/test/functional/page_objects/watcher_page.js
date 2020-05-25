/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function WatcherPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  class WatcherPage {
    async clearAllWatches() {
      const checkBoxExists = await testSubjects.exists('checkboxSelectAll');
      if (checkBoxExists) {
        await testSubjects.click('checkboxSelectAll');
        await testSubjects.click('btnDeleteWatches');
        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    }

    async createWatch(watchName, name) {
      await testSubjects.click('createWatchButton');
      await testSubjects.click('jsonWatchCreateLink');
      await find.setValue('#id', watchName);
      await find.setValue('#watchName', name);
      await find.clickByCssSelector('[type="submit"]');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getWatch(watchID) {
      const watchIdColumn = await testSubjects.find(`watchIdColumn-${watchID}`);
      const watchNameColumn = await testSubjects.find(`watchNameColumn-${watchID}`);
      const id = await watchIdColumn.getVisibleText();
      const name = await watchNameColumn.getVisibleText();
      return {
        id,
        name,
      };
    }

    async deleteWatch() {
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('btnDeleteWatches');
    }

    //get all the watches in the list
    async getWatches() {
      const watches = await find.allByCssSelector('.euiTableRow');
      return mapAsync(watches, async (watch) => {
        const checkBox = await watch.findByCssSelector('td:nth-child(1)');
        const id = await watch.findByCssSelector('td:nth-child(2)');
        const name = await watch.findByCssSelector('td:nth-child(3)');

        return {
          checkBox: (await checkBox.getAttribute('innerHTML')).includes('input'),
          id: await id.getVisibleText(),
          name: (await name.getVisibleText()).split(',').map((role) => role.trim()),
        };
      });
    }
  }
  return new WatcherPage();
}
