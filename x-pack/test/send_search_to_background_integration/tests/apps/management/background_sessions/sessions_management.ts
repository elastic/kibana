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

  describe('Background search sessions Management UI', () => {
    describe('New sessions', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('dashboard');
      });

      after(async () => {
        await sendToBackground.deleteAllBackgroundSessions();
      });

      it('Saves a session and verifies it in the Management app', async () => {
        await PageObjects.dashboard.loadSavedDashboard('Not Delayed');
        await PageObjects.dashboard.waitForRenderComplete();
        await sendToBackground.expectState('completed');
        await sendToBackground.save();
        await sendToBackground.expectState('backgroundCompleted');

        await sendToBackground.openPopover();
        await sendToBackground.viewBackgroundSessions();

        await testSubjects.existOrFail('session-mgmt-view-status-label-in_progress');
        await testSubjects.existOrFail('session-mgmt-view-status-tooltip-in_progress');
        await testSubjects.existOrFail('session-mgmt-table-col-created');
        await testSubjects.existOrFail('session-mgmt-view-action');

        expect(
          await testSubjects.find('session-mgmt-table-col-name').then((n) => n.getVisibleText())
        ).to.be('Not Delayed');
      });
    });

    describe('Archived sessions', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('management/kibana/background_sessions');
      });

      it('shows no items found', async () => {
        expectSnapshot(
          await testSubjects.find('backgroundSessionsMgmtTable').then((n) => n.getVisibleText())
        ).toMatchInline(`
          "Type
          Name
          Status
          Created
          Expiration
          No items found"
        `);
      });

      it('autorefreshes and shows items on the server', async () => {
        await esArchiver.load('data/bckgnd_sessions');

        const nameColumnText = await testSubjects
          .findAll('session-mgmt-table-col-name')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(nameColumnText.length).to.be(10);

        expectSnapshot(nameColumnText).toMatchInline(`
          Array [
            "In-Progress Session 1",
            "Completed Session 1",
            "Expired Session 1",
            "Cancelled Session 1",
            "Error Session 1",
            "In-Progress Session 2",
            "Completed Session 2",
            "Expired Session 2",
            "Cancelled Session 2",
            "A very very very very very very very very very very very very very very very very very very very very very very very long name Error Session 2",
          ]
        `);

        const createdColText = await testSubjects
          .findAll('session-mgmt-table-col-created')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(createdColText.length).to.be(10);

        expectSnapshot(createdColText).toMatchInline(`
          Array [
            "1 Dec, 2020, 00:00:00",
            "2 Dec, 2020, 00:00:00",
            "3 Dec, 2020, 00:00:00",
            "4 Dec, 2020, 00:00:00",
            "5 Dec, 2020, 00:00:00",
            "6 Dec, 2020, 00:00:00",
            "7 Dec, 2020, 00:00:00",
            "8 Dec, 2020, 00:00:00",
            "9 Dec, 2020, 00:00:00",
            "10 Dec, 2020, 00:00:00",
          ]
        `);

        const expiresColText = await testSubjects
          .findAll('session-mgmt-table-col-expires')
          .then((nCol) => Promise.all(nCol.map((n) => n.getVisibleText())));

        expect(expiresColText.length).to.be(10);

        expectSnapshot(expiresColText).toMatchInline(`
          Array [
            "--",
            "3 Dec, 2020, 00:00:00",
            "4 Dec, 2020, 00:00:00",
            "5 Dec, 2020, 00:00:00",
            "--",
            "--",
            "8 Dec, 2020, 00:00:00",
            "9 Dec, 2020, 00:00:00",
            "10 Dec, 2020, 00:00:00",
            "--",
          ]
        `);

        await esArchiver.unload('data/bckgnd_sessions');
      });

      it('pagination', async () => {
        await esArchiver.load('data/bckgnd_sessions');
        await esArchiver.unload('data/bckgnd_sessions');
      });
    });
  });
}
