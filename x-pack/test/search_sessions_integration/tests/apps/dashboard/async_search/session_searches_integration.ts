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
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'searchSessionsManagement',
  ]);
  const toasts = getService('toasts');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const dashboardExpect = getService('dashboardExpect');

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

    it('until session is saved search keepAlive is short, when it is saved, keepAlive is extended and search is saved into the session saved object, when session is extended, searches are also extended', async () => {
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

      let asyncExpirationTimeAfterSessionWasSaved: number;
      await retry.waitFor('async search keepAlive is extended', async () => {
        asyncExpirationTimeAfterSessionWasSaved = await searchSessions.getAsyncSearchExpirationTime(
          asyncSearchId
        );

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

      await searchSessionItem.extend();

      const asyncExpirationTimeAfterSessionWasExtended =
        await searchSessions.getAsyncSearchExpirationTime(asyncSearchId);

      expect(asyncExpirationTimeAfterSessionWasExtended).to.be.greaterThan(
        asyncExpirationTimeAfterSessionWasSaved!
      );
    });

    it('When session is deleted, searches are also deleted', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.dashboard.waitForRenderComplete();
      await searchSessions.expectState('completed');

      const searchResponse = await dashboardPanelActions.getSearchResponseByTitle(
        'Sum of Bytes by Extension'
      );

      const asyncSearchId = searchResponse.id;
      expect(typeof asyncSearchId).to.be('string');

      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );

      // check that search saved into the session

      await searchSessions.openPopover();
      await searchSessions.viewSearchSessions();

      const searchSessionList = await PageObjects.searchSessionsManagement.getList();
      const searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
      expect(searchSessionItem.searchesCount).to.be(1);
      await searchSessionItem.delete();

      const searchNotFoundError = await searchSessions
        .getAsyncSearchStatus(asyncSearchId)
        .catch((e) => e);
      expect(searchNotFoundError.name).to.be('ResponseError');
      expect(searchNotFoundError.meta.body.error.type).to.be('resource_not_found_exception');
    });

    describe('Slow lens with other bucket', () => {
      before(async function () {
        await kibanaServer.uiSettings.unset('search:timeout');
        await PageObjects.common.navigateToApp('dashboard', { insertTimestamp: false });
        await browser.execute(() => {
          window.ELASTIC_LENS_DELAY_SECONDS = 25;
        });
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      after(async function () {
        await browser.execute(() => {
          window.ELASTIC_LENS_DELAY_SECONDS = undefined;
        });
        await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      });

      it('Other bucket should be added to a session when restoring', async () => {
        // not using regular navigation method, because don't want to wait until all panels load
        // await PageObjects.dashboard.loadSavedDashboard('Lens with other bucket');
        await listingTable.clickItemLink('dashboard', 'Lens with other bucket');
        await testSubjects.missingOrFail('dashboardLandingPage');

        await searchSessions.expectState('loading');
        await searchSessions.save();
        await searchSessions.expectState('backgroundLoading');

        const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
          'Lens with other bucket'
        );

        await searchSessions.openPopover();
        await searchSessions.viewSearchSessions();

        let searchSessionList = await PageObjects.searchSessionsManagement.getList();
        let searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
        expect(searchSessionItem.searchesCount).to.be(1);
        await new Promise((resolve) => setTimeout(resolve, 10000));

        await searchSessionItem.view();

        // Check that session is still loading
        await searchSessions.expectState('backgroundLoading');
        await retry.waitFor('session restoration warnings related to other bucket', async () => {
          return (await toasts.getCount()) === 1;
        });
        await toasts.dismissAll();

        // check that other bucket requested add to a session
        await searchSessions.openPopover();
        await searchSessions.viewSearchSessions();

        searchSessionList = await PageObjects.searchSessionsManagement.getList();
        searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
        expect(searchSessionItem.searchesCount).to.be(2);

        await searchSessionItem.view();
        expect(await toasts.getCount()).to.be(0); // there should be no warnings
        await searchSessions.expectState('restored', 20000);
        await dashboardExpect.noErrorEmbeddablesPresent();

        const data = await elasticChart.getChartDebugData();
        expect(data!.bars![0].bars.length).to.eql(4);
      });
    });
  });
}
