/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'searchSessionsManagement',
  ]);
  const searchSessions = getService('searchSessions');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');

  // FLAKY: https://github.com/elastic/kibana/issues/89069
  describe.skip('Search search sessions Management UI', () => {
    describe('New search sessions', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
      });

      after(async () => {
        await searchSessions.deleteAllSearchSessions();
      });

      it('Saves a session and verifies it in the Management app', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        await PageObjects.dashboard.waitForRenderComplete();
        await searchSessions.expectState('completed');
        await searchSessions.save();
        await searchSessions.expectState('backgroundCompleted');

        await searchSessions.openPopover();
        await searchSessions.viewSearchSessions();

        await retry.waitFor(`wait for first item to complete`, async function () {
          const s = await PageObjects.searchSessionsManagement.getList();
          return s[0] && s[0].status === 'complete';
        });

        // find there is only one item in the table which is the newly saved session
        const searchSessionList = await PageObjects.searchSessionsManagement.getList();
        expect(searchSessionList.length).to.be(1);
        expect(searchSessionList[0].expires).not.to.eql('--');
        expect(searchSessionList[0].name).to.eql('Not Delayed');

        // navigate to dashboard
        await searchSessionList[0].view();

        // embeddable has loaded
        await testSubjects.existOrFail('embeddablePanelHeading-SumofBytesbyExtension');
        await PageObjects.dashboard.waitForRenderComplete();

        // search session was restored
        await searchSessions.expectState('restored');
      });

      it('Reloads as new session from management', async () => {
        await PageObjects.searchSessionsManagement.goTo();

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();

        expect(searchSessionList.length).to.be(1);
        await searchSessionList[0].reload();

        // embeddable has loaded
        await PageObjects.dashboard.waitForRenderComplete();

        // new search session was completed
        await searchSessions.expectState('completed');
      });

      it('Cancels a session from management', async () => {
        await PageObjects.searchSessionsManagement.goTo();

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();

        expect(searchSessionList.length).to.be(1);
        await searchSessionList[0].cancel();

        // TODO: update this once canceling doesn't delete the object!
        await retry.waitFor(`wait for list to be empty`, async function () {
          const s = await PageObjects.searchSessionsManagement.getList();

          return s.length === 0;
        });
      });
    });

    describe('Archived search sessions', () => {
      before(async () => {
        await PageObjects.searchSessionsManagement.goTo();
      });

      after(async () => {
        await searchSessions.deleteAllSearchSessions();
      });

      it('shows no items found', async () => {
        const searchSessionList = await PageObjects.searchSessionsManagement.getList();
        expect(searchSessionList.length).to.be(0);
      });

      it('autorefreshes and shows items on the server', async () => {
        await esArchiver.load('data/search_sessions');

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();

        expect(searchSessionList.length).to.be(10);

        expect(searchSessionList.map((ss) => ss.created)).to.eql([
          '25 Dec, 2020, 00:00:00',
          '24 Dec, 2020, 00:00:00',
          '23 Dec, 2020, 00:00:00',
          '22 Dec, 2020, 00:00:00',
          '21 Dec, 2020, 00:00:00',
          '20 Dec, 2020, 00:00:00',
          '19 Dec, 2020, 00:00:00',
          '18 Dec, 2020, 00:00:00',
          '17 Dec, 2020, 00:00:00',
          '16 Dec, 2020, 00:00:00',
        ]);

        expect(searchSessionList.map((ss) => ss.expires)).to.eql([
          '--',
          '--',
          '--',
          '23 Dec, 2020, 00:00:00',
          '22 Dec, 2020, 00:00:00',
          '--',
          '--',
          '--',
          '18 Dec, 2020, 00:00:00',
          '17 Dec, 2020, 00:00:00',
        ]);

        await esArchiver.unload('data/search_sessions');
      });
    });
  });
}
