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
  const esSupertest = getService('esSupertest');
  const PageObjects = getPageObjects(['security', 'common', 'header', 'settings', 'watcher']);

  describe('advanced watch', function () {
    before('initialize tests', async () => {
      // There may be system watches if monitoring was previously enabled
      // These cannot be deleted via the UI, so we need to delete via the API
      const watches = await esSupertest.get('/.watches/_search');

      if (watches.status === 200) {
        for (const hit of watches.body.hits.hits) {
          if (hit._id) {
            await esSupertest.delete(`/_watcher/watch/${hit._id}`);
          }
        }
      }

      await browser.setWindowSize(1600, 1000);
      await PageObjects.common.navigateToApp('settings');
      await testSubjects.click('watcher');
      await PageObjects.watcher.deleteAllWatches();
    });

    it('create and save a new advanced watch', async () => {
      await PageObjects.watcher.createAdvancedWatch(watchID, watchName);
      const watch = await PageObjects.watcher.getWatch(watchID);
      expect(watch.id).to.be(watchID);
      expect(watch.name).to.be(watchName);
    });

    it('should prompt user to check to see if you can override an advanced watch with a sameID', async () => {
      await PageObjects.watcher.createAdvancedWatch(watchID, updatedName);
      const modal = await testSubjects.find('confirmModalBodyText');
      const modalText = await modal.getVisibleText();
      expect(modalText).to.be('Saving this watch will overwrite previous content.');
      await testSubjects.click('confirmModalConfirmButton');
      const watch = await PageObjects.watcher.getWatch(watchID);
      expect(watch.id).to.be(watchID);
      expect(watch.name).to.be(updatedName);
    });

    //delete the watch
    it('should delete the advanced watch', async () => {
      const watchList = indexBy(await PageObjects.watcher.getAllWatches(), 'id');
      log.debug(watchList);
      expect(watchList.watchID.name).to.eql([updatedName]);
      await PageObjects.watcher.deleteAllWatches();
      await PageObjects.header.waitUntilLoadingHasFinished();
      retry.try(async () => {
        const row = await find.byCssSelector('.euiTableRow');
        const cell = await row.findByCssSelector('td:nth-child(1)');
        expect(cell.getVisibleText()).to.equal('No watches to show');
      });
    });
  });
}
