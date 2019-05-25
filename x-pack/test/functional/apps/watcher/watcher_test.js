/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { indexBy } from 'lodash';

const watchID = 'watchID';
const watchName = 'watch Name';
const updatedName = 'updatedName';
export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['security', 'common', 'header', 'settings', 'watcher']);

  describe('watcher_test', function () {
    before('initialize tests', async () => {
      await browser.setWindowSize(1600, 1000);
      await PageObjects.common.navigateToApp('settings');
      await testSubjects.click('watcher');
      await PageObjects.watcher.clearAllWatches();
    });

    it('create and save a new watch', async () => {
      await PageObjects.watcher.createWatch(watchID, watchName);
      const watch = await PageObjects.watcher.getWatch(watchID);
      expect(watch.id).to.be(watchID);
      expect(watch.name).to.be(watchName);
    });

    it('should prompt user to check to see if you can override a watch with a sameID', async () => {
      await PageObjects.watcher.createWatch(watchID, updatedName);
      const modal = await testSubjects.find('confirmModalBodyText');
      const modalText =  await modal.getVisibleText();
      expect(modalText).to.be(`Watch with ID "${watchID}" (name: "${watchName}") already exists. Do you want to overwrite it?`);
      await testSubjects.click('confirmModalConfirmButton');
      const watch = await PageObjects.watcher.getWatch(watchID);
      expect(watch.id).to.be(watchID);
      expect(watch.name).to.be(updatedName);
    });

    //delete the watch
    it('should delete the watch', async () => {
      const watchList = indexBy(await PageObjects.watcher.getWatches(), 'id');
      log.debug(watchList);
      expect(watchList.watchID.name).to.eql([updatedName]);
      await PageObjects.watcher.deleteWatch(watchID);
      const modal = await testSubjects.find('confirmModalBodyText');
      const modalText =  await modal.getVisibleText();
      expect(modalText).to.be('This will permanently delete 1 Watch. Are you sure?');
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      const watchList1 = indexBy(await PageObjects.watcher.getWatches(), 'id');
      log.debug(watchList1);
      expect(watchList1).to.not.have.key(watchID);
    });

  });
}
