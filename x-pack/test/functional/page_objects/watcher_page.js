/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function WatcherPageProvider({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header', 'settings']);
  const find = getService('find');
  //const log = getService('log');
  const testSubjects = getService('testSubjects');

  class WatcherPage {
    async deleteAllWatches() {
      const checkBoxExists = await testSubjects.exists('selectAllWatchesCheckBox');
      if (checkBoxExists) {
        await testSubjects.click('checkboxSelectAll');
        await testSubjects.click('btnDeleteWatches');
        await testSubjects.click('confirmModalConfirmButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      }
    }

    async createThresholdAlert(name, index, timeField, timeUnit) {
      await testSubjects.click('createWatchButton');
      await testSubjects.click('thresholdWatchCreateLink');
      const thresholdName = await testSubjects.find('nameInput');
      await thresholdName.setValue(name);
      await testSubjects.setValue(index);
      console.log(timeField, timeUnit);
      // await find.allByCssSelector()
    }

    async createAdvancedWatch(watchName, name) {
      await testSubjects.click('createAdvancedWatchButton');
      await find.setValue('#id', watchName);
      await find.setValue('#watchName', name);
      await find.clickByCssSelector('[type="submit"]');
      await PageObjects.header.waitUntilLoadingHasFinished();
    }

    async getWatch(watchID) {
      const watchRow = await testSubjects.find(`watchRow-${watchID}`);
      const text =  await watchRow.getVisibleText();
      const columns = text.split('\n');
      const checkBox = await testSubjects.find(`checkboxSelectRow-${watchID}`);
      return {
        id: columns[0],
        name: columns[1],
        checkBox
      };
    }

    async deleteWatch() {
      await testSubjects.click('checkboxSelectAll');
      await testSubjects.click('btnDeleteWatches');
    }

    //get all the watches in the list
    async getAllWatches() {
      const watches = await find.allByCssSelector('.kuiTableRow');
      return mapAsync(watches, async watch => {
        const checkBox = await watch.findByCssSelector('td:nth-child(1)');
        const id = await watch.findByCssSelector('td:nth-child(2)');
        const name = await watch.findByCssSelector('td:nth-child(3)');

        return {
          checkBox: (await checkBox.getAttribute('innerHTML')).includes('input'),
          id: await id.getVisibleText(),
          name: (await name.getVisibleText()).split(',').map(role => role.trim()),
        };
      });
    }
  }
  return new WatcherPage();
}
