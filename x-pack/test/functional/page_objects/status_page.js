/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function StatusPagePageProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'home', 'security']);

  class StatusPage {
    async initTests() {
      log.debug('StatusPage:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        const url = PageObjects.common.getHostPort() + '/status';
        log.info(`StatusPage:navigateToPage(): ${url}`);
        await remote.get(url);
      });
    }

    async expectStatusPage() {
      return await retry.try(async () => {
        log.debug(`expectStatusPage()`);
        await remote.setFindTimeout(20000).findByCssSelector('[data-test-subj="kibanaChrome"] nav:not(.ng-hide) ');
        const url = await remote.getCurrentUrl();
        expect(url).to.contain(`/status`);
      });
    }
  }

  return new StatusPage();
}
