/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function UpgradeCheckupProvider({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'home', 'security']);

  class UpgradeCheckup {
    async initTests() {
      log.debug('UpgradeCheckup:initTests');
    }

    async navigateToPage() {
      return await retry.try(async () => {
        await PageObjects.common.navigateToApp('monitoring');
        const url = PageObjects.common.getHostPort() + '/app/kibana#/management/upgrade_checkup';
        log.info(`UpgradeCheckup:navigateToPage(): ${url}`);
        await remote.get(url);
      });
    }

    async expectUpgradeCheckup() {
      return await retry.try(async () => {
        log.debug(`expectUpgradeCheckup()`);
        await remote.setFindTimeout(20000).findByCssSelector('[data-test-subj="upgradeCheckupRoot"]');
        const url = await remote.getCurrentUrl();
        expect(url).to.contain(`/upgrade_checkup`);
      });
    }
  }

  return new UpgradeCheckup();
}
