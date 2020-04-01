/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SpaceSelectorPageProvider({ getService, getPageObjects }: FtrProviderContext) {
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

    async clickSpaceCard(spaceId: string) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceCard(${spaceId})`);
        await testSubjects.click(`space-card-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }

    async expectHomePage(spaceId: string) {
      return await this.expectRoute(spaceId, `/app/kibana#/home`);
    }

    async expectRoute(spaceId: string, route: string) {
      return await retry.try(async () => {
        log.debug(`expectRoute(${spaceId}, ${route})`);
        await find.byCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ', 20000);
        const url = await browser.getCurrentUrl();
        if (spaceId === 'default') {
          expect(url).to.contain(route);
        } else {
          expect(url).to.contain(`/s/${spaceId}${route}`);
        }
      });
    }

    async openSpacesNav() {
      log.debug('openSpacesNav()');
      return await testSubjects.click('spacesNavSelector');
    }

    async clickSpaceAvatar(spaceId: string) {
      return await retry.try(async () => {
        log.info(`SpaceSelectorPage:clickSpaceAvatar(${spaceId})`);
        await testSubjects.click(`space-avatar-${spaceId}`);
        await PageObjects.common.sleep(1000);
      });
    }
  }

  return new SpaceSelectorPage();
}
