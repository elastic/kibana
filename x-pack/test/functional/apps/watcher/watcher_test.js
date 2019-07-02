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
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['security', 'common', 'header', 'settings', 'watcher']);

  describe('watcher_test', function () {
    before('initialize tests', async () => {
      await browser.setWindowSize(1600, 1000);
      await PageObjects.common.navigateToApp('watcher');
      await PageObjects.watcher.clearAllWatches();
    });

    it('create and save a new watch', async () => {
      await PageObjects.watcher.createWatch(watchID, watchName);
      const watch = await PageObjects.watcher.getWatch(watchID);
      expect(watch.id).to.be(watchID);
      expect(watch.name).to.be(watchName);
    });

    it('should not allow a user to save a watch with the same ID', async () => {
      await PageObjects.watcher.createWatch(watchID, updatedName);
      const errorCallout = await testSubjects.find('sectionErrorMessage');
      const errorCalloutText = await errorCallout.getVisibleText();
      expect(errorCalloutText).to.be(`There is already a watch with ID '${watchID}'.`);
    });

    //delete the watch
    it('should delete the watch', async () => {
      // Navigate to the main list page
      await PageObjects.common.navigateToApp('watcher');
      const watchList = indexBy(await PageObjects.watcher.getWatches(), 'id');
      log.debug(watchList);
      expect(watchList.watchID.name).to.eql([watchName]);
      await PageObjects.watcher.deleteWatch(watchID);
      await testSubjects.click('confirmModalConfirmButton');
      await PageObjects.header.waitUntilLoadingHasFinished();
      retry.try(async () => {
        const row = await find.byCssSelector('.euiTableRow');
        const cell = await row.findByCssSelector('td:nth-child(1)');
        expect(cell.getVisibleText()).to.equal('No watches to show');
      });
    });
  });
}
