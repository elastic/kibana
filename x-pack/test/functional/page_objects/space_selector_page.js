/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export function SpaceSelectorPageProvider({ getService, getPageObjects }) {

  const retry = getService('retry');
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  const browser = getService('browser');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header', 'security']);

  class SpaceSelectorPage {
    async initTests() {
      log.debug('SpaceSelectorPage:initTests');
    }

    async clickSpaceCard(spaceId) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceCard(${spaceId})`);
        await testSubjects.click(`space-card-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }

    async navigateToSpaceGrid() {
      return await retry.try(async () => {
        await PageObjects.common.navigateToApp('settings');
        await testSubjects.click('manage_spaces');
      });
    }

    async clickCreateSpace() {
      return await retry.try(async ()=> {
        log.debug('create spaces');
        await testSubjects.click('createSpaceGrid');
        await PageObjects.common.sleep(1000);
        log.debug('create space page');
      });
    }


    async inputSpaceName(spaceName) {
      return await retry.try(async ()=> {
        log.debug('Add space name');
        const nameInput = await retry.try(()=>find.byCssSelector('input[data-test-subj="spaceNameField"]'));
        await nameInput.type(spaceName);
        await PageObjects.common.sleep(1000);
        log.debug('space name is space a');
      });
    }

    async inputSpaceDescriptor(spaceDescriptor) {
      return await retry.try(async ()=> {
        log.debug('Add space descriptor');
        const descInput = await retry.try(()=>find.byCssSelector('input[data-test-subj="spaceDescriptionField"]'));
        await descInput.type(spaceDescriptor);
        await PageObjects.common.sleep(1000);
        log.debug('space desc is such a cool space');
      });
    }

    async clickSaveSpace() {
      log.debug('click save space');
      return await testSubjects.click('save-space-button');
    }

    async expectHomePage(spaceId) {
      return await retry.try(async () => {
        log.debug(`expectHomePage(${spaceId})`);
        await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
        const url = await browser.getCurrentUrl();
        if (spaceId === 'default') {
          expect(url).to.contain(`/app/kibana#/home`);
        } else {
          expect(url).to.contain(`/s/${spaceId}/app/kibana#/home`);
        }
      });
    }

    async openSpacesNav() {
      log.debug('openSpacesNav()');
      return await testSubjects.click('spacesNavSelector');
    }

    async clickSpaceAvatar(spaceId) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceAvatar(${spaceId})`);
        await testSubjects.click(`space-avatar-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }
  }

  return new SpaceSelectorPage();
}
