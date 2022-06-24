/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'searchSessionsManagement',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');

  describe('Session and searches integration', () => {
    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async function () {
      await searchSessions.deleteAllSearchSessions();
    });

    it('until session is saved search keepAlive is short, when it is saved, keepAlive is extended and search is saved into the session saved object', async () => {
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.dashboard.waitForRenderComplete();
      await searchSessions.expectState('completed');

      const searchResponse = await dashboardPanelActions.getSearchResponseByTitle(
        'Sum of Bytes by Extension'
      );

      const asyncSearchId = searchResponse.id;
      expect(typeof asyncSearchId).to.be('string');

      const asyncExpirationTimeBeforeSessionWasSaved =
        await searchSessions.getAsyncSearchExpirationTime(asyncSearchId);
      expect(asyncExpirationTimeBeforeSessionWasSaved).to.be.lessThan(
        Date.now() + 1000 * 60,
        'expiration time should be less then a minute from now'
      );

      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      await retry.waitFor('async search keepAlive is extended', async () => {
        const asyncExpirationTimeAfterSessionWasSaved =
          await searchSessions.getAsyncSearchExpirationTime(asyncSearchId);

        return (
          asyncExpirationTimeAfterSessionWasSaved > asyncExpirationTimeBeforeSessionWasSaved &&
          asyncExpirationTimeAfterSessionWasSaved > Date.now() + 1000 * 60
        );
      });

      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );

      // check that search saved into the session

      await searchSessions.openPopover();
      await searchSessions.viewSearchSessions();

      const searchSessionList = await PageObjects.searchSessionsManagement.getList();
      const searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
      expect(searchSessionItem.searchesCount).to.be(1);
    });
  });
}
