/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function WatcherPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const remote = getService('remote');
  const testSubjects = getService('testSubjects');

  class WatcherPage {
    async clearAllWatches() {
      const checkBoxExists = await testSubjects.exists('selectAllWatchesCheckBox');
      if (checkBoxExists) {
        await testSubjects.click('selectAllWatchesCheckBox');
        await testSubjects.click('btnDeleteWatches');
        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    }

    async createWatch(watchName, name) {
      await testSubjects.click('createAdvancedWatchButton');
      await remote.findById('id').type(watchName);
      await remote.findById('name').type(name);
      await testSubjects.click('btnSaveWatch');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getWatch(watchID) {
      const watchRow = await testSubjects.find(`watchRow-${watchID}`);
      const text =  await watchRow.getVisibleText();
      const columns = text.split("\n");
      return {
        id: columns[0],
        name: columns[1]
      };
    }

    async deleteWatch() {
      await testSubjects.click('selectAllWatchesCheckBox');
      await testSubjects.click('btnDeleteWatches');
    }

    //get all the watches in the list
    async getWatches() {
      const watches = await remote.findAllByCssSelector('.kuiTableRow');
      return mapAsync(watches, async watch => {
        const checkBox = await watch.findByCssSelector('td:nth-child(1)');
        const id = await watch.findByCssSelector('td:nth-child(2)');
        const name = await watch.findByCssSelector('td:nth-child(3)');

        return {
          checkBox: (await checkBox.getProperty('innerHTML')).includes('input'),
          id: await id.getVisibleText(),
          name: (await name.getVisibleText()).split(',').map(role => role.trim())
        };
      });
    }
  }
  return new WatcherPage();
}
