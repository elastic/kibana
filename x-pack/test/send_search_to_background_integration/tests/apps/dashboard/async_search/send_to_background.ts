/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'visChart']);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const browser = getService('browser');
  const sendToBackground = getService('sendToBackground');

  describe('send to background', () => {
    before(async function () {
      const { body } = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
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

      const session1 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      expect(session1).to.be(fakeSessionId);

      await sendToBackground.refresh();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await sendToBackground.expectState('completed');
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const session2 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      expect(session2).not.to.be(fakeSessionId);
    });

    it('Saves and restores a session', async () => {
      await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
      await PageObjects.dashboard.waitForRenderComplete();
      await sendToBackground.expectState('completed');
      await sendToBackground.save();
      await sendToBackground.expectState('backgroundCompleted');
      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );

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

      // switching dashboard to edit mode (or any other non-fetch required) state change
      // should leave session state untouched
      await PageObjects.dashboard.switchToEditMode();
      await sendToBackground.expectState('restored');
    });
  });
}
