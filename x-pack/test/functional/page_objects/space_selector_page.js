/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function SpaceSelectorPageProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'home', 'security']);

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

    async expectHomePage(spaceId) {
      return await retry.try(async () => {
        log.debug(`expectHomePage(${spaceId})`);
        await this.dismissWelcomeScreen();
        await remote.setFindTimeout(20000).findByCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ');
        const url = await remote.getCurrentUrl();
        if (spaceId === 'default') {
          expect(url).to.contain(`/app/kibana#/home`);
        } else {
          expect(url).to.contain(`/s/${spaceId}/app/kibana#/home`);
        }
      });
    }

    async dismissWelcomeScreen() {
      if (await PageObjects.home.isWelcomeShowing()) {
        await PageObjects.home.hideWelcomeScreen();
      }
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
