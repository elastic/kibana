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
export default function({ getService, getPageObjects }) {
  const browser = getService('browser');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const esSupertest = getService('esSupertest');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'watcher']);

  describe('watcher_test', function() {
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
      await PageObjects.common.navigateToApp('watcher');
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
      await retry.try(async () => {
        const emptyPrompt = await testSubjects.find('emptyPrompt');
        const emptyPromptText = await emptyPrompt.getVisibleText();
        expect(emptyPromptText).to.contain('You don’t have any watches yet\n');
      });
    });
  });
}
