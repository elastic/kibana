/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
    'searchSessionsManagement',
  ]);
  const searchSessions = getService('searchSessions');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('Search Sessions Management UI', () => {
    describe('New search sessions', () => {
      before(async () => {
        await searchSessions.deleteAllSearchSessions();
        await PageObjects.common.navigateToApp('dashboard');
        log.debug('wait for dashboard landing page');
        await retry.tryForTime(10000, async () => {
          testSubjects.existOrFail('dashboardLandingPage');
        });
        await searchSessions.markTourDone();
      });

      after(async () => {
        await searchSessions.deleteAllSearchSessions();
      });

      it('Saves a session and verifies it in the Management app', async () => {
        log.debug('loading the "Not Delayed" dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        await PageObjects.dashboard.waitForRenderComplete();
        await searchSessions.expectState('completed');
        const searchSessionName = `Session - ${uuid()}`;
        await searchSessions.save({ searchSessionName });
        await searchSessions.expectState('backgroundCompleted');

        await searchSessions.openPopover();
        await searchSessions.viewSearchSessions();

        await retry.waitFor(`first item to complete`, async function () {
          const s = await PageObjects.searchSessionsManagement.getList();
          if (!s[0]) {
            log.warning(`Expected item is not in the table!`);
          } else {
            log.debug(`First item status: ${s[0].status}`);
          }
          return s[0] && s[0].status === 'complete';
        });

        // find there is only one item in the table which is the newly saved session
        log.debug('find the newly saved session');
        const searchSessionList = await PageObjects.searchSessionsManagement.getList();
        expect(searchSessionList.length).to.be(1);
        expect(searchSessionList[0].expires).not.to.eql('--');
        expect(searchSessionList[0].name).to.be(searchSessionName);

        // navigate to dashboard
        await searchSessionList[0].view();

        // embeddable has loaded
        await testSubjects.existOrFail('embeddablePanelHeading-SumofBytesbyExtension');
        await PageObjects.dashboard.waitForRenderComplete();

        // search session was restored
        await searchSessions.expectState('restored');
      });

      it('Deletes a session from management', async () => {
        await PageObjects.searchSessionsManagement.goTo();

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();

        expect(searchSessionList.length).to.be(1);
        await searchSessionList[0].delete();

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
        await esArchiver.load('x-pack/test/functional/es_archives/data/search_sessions');

        const searchSessionList = await PageObjects.searchSessionsManagement.getList();
        expect(searchSessionList.length).to.be(10);
        expectSnapshot(
          searchSessionList.map((ss) => [ss.app, ss.name, ss.created, ss.expires, ss.status])
        ).toMatchInline(`
          Array [
            Array [
              "graph",
              "[eCommerce] Orders Test 6",
              "16 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "lens",
              "[eCommerce] Orders Test 7",
              "15 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "apm",
              "[eCommerce] Orders Test 8",
              "14 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "appSearch",
              "[eCommerce] Orders Test 9",
              "13 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "auditbeat",
              "[eCommerce] Orders Test 10",
              "12 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "code",
              "[eCommerce] Orders Test 11",
              "11 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "console",
              "[eCommerce] Orders Test 12",
              "10 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "security",
              "[eCommerce] Orders Test 5",
              "9 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
            Array [
              "visualize",
              "[eCommerce] Orders Test 4",
              "8 Feb, 2021, 00:00:00",
              "--",
              "cancelled",
            ],
            Array [
              "canvas",
              "[eCommerce] Orders Test 3",
              "7 Feb, 2021, 00:00:00",
              "--",
              "expired",
            ],
          ]
        `);

        await esArchiver.unload('x-pack/test/functional/es_archives/data/search_sessions');
      });

      it('has working pagination controls', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/data/search_sessions');

        log.debug(`loading first page of sessions`);
        const sessionListFirst = await PageObjects.searchSessionsManagement.getList();
        expect(sessionListFirst.length).to.be(10);

        await testSubjects.click('pagination-button-next');

        const sessionListSecond = await PageObjects.searchSessionsManagement.getList();
        expect(sessionListSecond.length).to.be(2);

        expectSnapshot(sessionListSecond.map((ss) => [ss.app, ss.name, ss.created, ss.expires]))
          .toMatchInline(`
          Array [
            Array [
              "discover",
              "[eCommerce] Orders Test 2",
              "6 Feb, 2021, 00:00:00",
              "--",
            ],
            Array [
              "dashboard",
              "[eCommerce] Revenue Dashboard",
              "5 Feb, 2021, 00:00:00",
              "--",
            ],
          ]
        `);

        await esArchiver.unload('x-pack/test/functional/es_archives/data/search_sessions');
      });
    });
  });
}
