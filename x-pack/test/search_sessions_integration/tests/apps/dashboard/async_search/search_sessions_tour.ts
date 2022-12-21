/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'visChart']);
  const browser = getService('browser');
  const searchSessions = getService('searchSessions');
  const kibanaServer = getService('kibanaServer');

  describe('search sessions tour', () => {
    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
        return;
      }
      await kibanaServer.uiSettings.replace({ 'search:timeout': 30000 });
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await searchSessions.markTourUndone();
    });

    after(async function () {
      await searchSessions.deleteAllSearchSessions();
      await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      await searchSessions.markTourDone();
    });

    it('search session popover auto opens when search is taking a while', async () => {
      await PageObjects.dashboard.loadSavedDashboard('Delayed 15s');

      await searchSessions.openedOrFail(); // tour auto opens when there is a long running search

      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('completed');

      const url = await browser.getCurrentUrl();
      const fakeSessionId = '__fake__';
      const savedSessionURL = `${url}&searchSessionId=${fakeSessionId}`;
      await browser.get(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      await searchSessions.openedOrFail(); // tour auto opens on first restore

      await browser.get(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      await searchSessions.closedOrFail(); // do not open on next restore
    });
  });
}
