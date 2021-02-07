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
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'searchSessionsManagement',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const browser = getService('browser');
  const searchSessions = getService('searchSessions');
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');

  describe('send to background', () => {
    before(async function () {
      const { body } = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
      await PageObjects.common.navigateToApp('dashboard');
    });

    after(async function () {
      await searchSessions.deleteAllSearchSessions();
    });

    it('Restore using non-existing sessionId errors out. Refresh starts a new session and completes. Back button restores a session.', async () => {
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      let url = await browser.getCurrentUrl();
      const fakeSessionId = '__fake__';
      const savedSessionURL = `${url}&searchSessionId=${fakeSessionId}`;
      await browser.get(savedSessionURL);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');
      await testSubjects.existOrFail('embeddableErrorLabel'); // expected that panel errors out because of non existing session

      const session1 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      expect(session1).to.be(fakeSessionId);

      await queryBar.clickQuerySubmitButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('completed');
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const session2 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      expect(session2).not.to.be(fakeSessionId);

      // back button should restore the session:
      url = await browser.getCurrentUrl();
      expect(url).not.to.contain('searchSessionId');

      await browser.goBack();

      url = await browser.getCurrentUrl();
      expect(url).to.contain('searchSessionId');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await searchSessions.expectState('restored');

      expect(
        await dashboardPanelActions.getSearchSessionIdByTitle('Sum of Bytes by Extension')
      ).to.be(fakeSessionId);
    });

    it('Saves and restores a session, navigate away when complete', async () => {
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.dashboard.waitForRenderComplete();
      await searchSessions.expectState('completed');
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      // load URL to restore a saved session
      await PageObjects.searchSessionsManagement.restoreLatest();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.waitForRenderComplete();

      // Check that session is restored
      await searchSessions.expectState('restored');
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const data = await PageObjects.visChart.getBarChartData('Sum of bytes');
      expect(data.length).to.be(5);

      // switching dashboard to edit mode (or any other non-fetch required) state change
      // should leave session state untouched
      await PageObjects.dashboard.switchToEditMode();
      await searchSessions.expectState('restored');

      // navigating to a listing page clears the session
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await searchSessions.missingOrFail();
    });

    describe('slower stuff', () => {
      before(async () => {
        await kibanaServer.uiSettings.replace({ 'search:timeout': 30000 });
      });
      after(async () => {
        await kibanaServer.uiSettings.replace({ 'search:timeout': 10000 });
      });

      it('Saves and restores a session, navigate away while loading', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Delayed 15s');
        await searchSessions.expectState('loading');
        await searchSessions.save('loading');

        // load URL to restore a saved session
        await PageObjects.searchSessionsManagement.restoreLatest();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();

        // Check that session is restored
        await searchSessions.expectState('restored');
        await testSubjects.missingOrFail('embeddableErrorLabel');
      }).timeout(60000);
    });
  });
}
