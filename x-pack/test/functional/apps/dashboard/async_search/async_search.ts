/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'visChart']);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const queryBar = getService('queryBar');
  const browser = getService('browser');
  const sendToBackground = getService('sendToBackground');

  describe('dashboard with async search', () => {
    before(async function () {
      const { body } = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
    });

    it('not delayed should load', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const data = await PageObjects.visChart.getBarChartData('Sum of bytes');
      expect(data.length).to.be(5);
    });

    it('delayed should load', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Delayed 5s');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const data = await PageObjects.visChart.getBarChartData('');
      expect(data.length).to.be(5);
    });

    it('timed out should show error', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Delayed 15s');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('embeddableErrorLabel');
      await testSubjects.existOrFail('searchTimeoutError');
    });

    it('multiple searches are grouped and only single error popup is shown', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.loadSavedDashboard('Multiple delayed');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('embeddableErrorLabel');
      // there should be two failed panels
      expect((await testSubjects.findAll('embeddableErrorLabel')).length).to.be(2);
      // but only single error toast because searches are grouped
      expect((await testSubjects.findAll('searchTimeoutError')).length).to.be(1);

      const panel1SessionId1 = await getSearchSessionIdByPanel('Sum of Bytes by Extension');
      const panel2SessionId1 = await getSearchSessionIdByPanel(
        'Sum of Bytes by Extension (Delayed 5s)'
      );
      expect(panel1SessionId1).to.be(panel2SessionId1);

      await queryBar.clickQuerySubmitButton();

      const panel1SessionId2 = await getSearchSessionIdByPanel('Sum of Bytes by Extension');
      const panel2SessionId2 = await getSearchSessionIdByPanel(
        'Sum of Bytes by Extension (Delayed 5s)'
      );
      expect(panel1SessionId2).to.be(panel2SessionId2);
      expect(panel1SessionId1).not.to.be(panel1SessionId2);
    });

    describe('Send to background', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
      });

      it('Restore using non-existing sessionId errors out. Refresh starts a new session and completes.', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        const url = await browser.getCurrentUrl();
        const fakeSessionId = '__fake__';
        const savedSessionURL = `${url}&searchSessionId=${fakeSessionId}`;
        await browser.get(savedSessionURL);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await sendToBackground.expectState('restored');
        await testSubjects.existOrFail('embeddableErrorLabel'); // expected that panel errors out because of non existing session

        const session1 = await getSearchSessionIdByPanel('Sum of Bytes by Extension');
        expect(session1).to.be(fakeSessionId);

        await sendToBackground.refresh();
        await PageObjects.header.waitUntilLoadingHasFinished();
        await sendToBackground.expectState('completed');
        await testSubjects.missingOrFail('embeddableErrorLabel');
        const session2 = await getSearchSessionIdByPanel('Sum of Bytes by Extension');
        expect(session2).not.to.be(fakeSessionId);
      });

      it('Saves and restores a session', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        await PageObjects.dashboard.waitForRenderComplete();
        await sendToBackground.expectState('completed');
        await sendToBackground.save();
        await sendToBackground.expectState('backgroundCompleted');
        const savedSessionId = await getSearchSessionIdByPanel('Sum of Bytes by Extension');

        // load URL to restore a saved session
        const url = await browser.getCurrentUrl();
        const savedSessionURL = `${url}&searchSessionId=${savedSessionId}`;
        await browser.get(savedSessionURL);
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.dashboard.waitForRenderComplete();

        // Check that session is restored
        await sendToBackground.expectState('restored');
        await testSubjects.missingOrFail('embeddableErrorLabel');
        const data = await PageObjects.visChart.getBarChartData('Sum of bytes');
        expect(data.length).to.be(5);
      });
    });
  });

  // HELPERS
  async function getSearchSessionIdByPanel(panelTitle: string) {
    await dashboardPanelActions.openInspectorByTitle(panelTitle);
    await inspector.openInspectorRequestsView();
    const searchSessionId = await (
      await testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await inspector.close();
    return searchSessionId;
  }
}
