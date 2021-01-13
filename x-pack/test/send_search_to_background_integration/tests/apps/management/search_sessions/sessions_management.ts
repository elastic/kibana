/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'visChart']);
  const sendToBackground = getService('sendToBackground');
  const esArchiver = getService('esArchiver');

  describe('Search search sessions Management UI', () => {
    describe('New search sessions', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
      });

      after(async () => {
        await sendToBackground.deleteAllSearchSessions();
      });

      it('Saves a session and verifies it in the Management app', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        await PageObjects.dashboard.waitForRenderComplete();
        await sendToBackground.expectState('completed');
        await sendToBackground.save();
        await sendToBackground.expectState('backgroundCompleted');

        await sendToBackground.openPopover();
        await sendToBackground.viewSearchSessions();

        // wait until completed
        await testSubjects.existOrFail('session-mgmt-view-status-label-complete');
        await testSubjects.existOrFail('session-mgmt-view-status-tooltip-complete');
        await testSubjects.existOrFail('session-mgmt-table-col-created');

        // find there is only one item in the table which is the newly saved session
        const names = await testSubjects.findAll('session-mgmt-table-col-name');
        expect(names.length).to.be(1);
        expect(await Promise.all(names.map((n) => n.getVisibleText()))).to.eql(['Not Delayed']);

        // navigate to dashboard
        await testSubjects.click('session-mgmt-table-col-name');

        // embeddable has loaded
        await testSubjects.existOrFail('embeddablePanelHeading-SumofBytesbyExtension');
        await PageObjects.dashboard.waitForRenderComplete();

        // background session was restored
        await sendToBackground.expectState('restored');
      });
    });

    describe('Archived search sessions', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('management/kibana/search_sessions');
      });

      after(async () => {
        await sendToBackground.deleteAllSearchSessions();
      });

      it('shows no items found', async () => {
        expectSnapshot(
          await testSubjects.find('searchSessionsMgmtTable').then((n) => n.getVisibleText())
        ).toMatchInline(`
          "App
          Name
          Status
          Created
          Expiration
          No items found"
        `);
      });

      it('autorefreshes and shows items on the server', async () => {
        await esArchiver.load('data/search_sessions');

        const nameColumnText = await testSubjects
          .findAll('session-mgmt-table-col-name')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(nameColumnText.length).to.be(10);

        const createdColText = await testSubjects
          .findAll('session-mgmt-table-col-created')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(createdColText.length).to.be(10);

        expectSnapshot(createdColText).toMatchInline(`
          Array [
            "25 Dec, 2020, 00:00:00",
            "24 Dec, 2020, 00:00:00",
            "23 Dec, 2020, 00:00:00",
            "22 Dec, 2020, 00:00:00",
            "21 Dec, 2020, 00:00:00",
            "20 Dec, 2020, 00:00:00",
            "19 Dec, 2020, 00:00:00",
            "18 Dec, 2020, 00:00:00",
            "17 Dec, 2020, 00:00:00",
            "16 Dec, 2020, 00:00:00",
          ]
        `);

        const expiresColText = await testSubjects
          .findAll('session-mgmt-table-col-expires')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(expiresColText.length).to.be(10);

        expectSnapshot(expiresColText).toMatchInline(`
          Array [
            "--",
            "25 Dec, 2020, 00:00:00",
            "24 Dec, 2020, 00:00:00",
            "23 Dec, 2020, 00:00:00",
            "--",
            "--",
            "20 Dec, 2020, 00:00:00",
            "19 Dec, 2020, 00:00:00",
            "18 Dec, 2020, 00:00:00",
            "--",
          ]
        `);

        await esArchiver.unload('data/search_sessions');
      });
    });
  });
}
