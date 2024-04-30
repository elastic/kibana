/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { generateUniqueKey } from '../../../lib/get_test_data';
import { createMaintenanceWindow, createObjectRemover } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'maintenanceWindows', 'header']);
  const retry = getService('retry');
  const toasts = getService('toasts');

  let objectRemover: ObjectRemover;
  const browser = getService('browser');

  describe('Maintenance windows table', function () {
    before(async () => {
      objectRemover = await createObjectRemover({ getService });
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should should cancel a running maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Running');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-cancel');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Cancelled running maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.not.eql('Running');
    });

    it('should should archive finished maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Archived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');
    });

    it('should should cancel and archive a running maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Running');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-cancel-and-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Cancelled and archived running maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');
    });

    it('should should unarchive a maintenance window', async () => {
      const name = generateUniqueKey();
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name,
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      let list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-archive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Archived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Archived');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-unarchive');
      await testSubjects.click('confirmModalConfirmButton');

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Unarchived maintenance window '${name}'`);
      });

      await pageObjects.maintenanceWindows.searchMaintenanceWindows(name);

      list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(1);
      expect(list[0].status).to.eql('Finished');
    });

    it('should filter maintenance windows by the status', async () => {
      const running = await createMaintenanceWindow({
        name: 'running-mw',
        getService,
      });
      objectRemover.add(running.id, 'rules/maintenance_window', 'alerting', true);
      const finished = await createMaintenanceWindow({
        name: 'finished-mw',
        startDate: new Date('05-01-2023'),
        notRecurring: true,
        getService,
      });
      objectRemover.add(finished.id, 'rules/maintenance_window', 'alerting', true);

      const date = new Date();
      date.setDate(date.getDate() + 1);
      const upcoming = await createMaintenanceWindow({
        name: 'upcoming-mw',
        startDate: date,
        getService,
      });
      objectRemover.add(upcoming.id, 'rules/maintenance_window', 'alerting', true);
      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows('mw');

      const list = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
      expect(list.length).to.eql(3);

      await testSubjects.click('status-filter-button');
      await testSubjects.click('status-filter-upcoming'); // select Upcoming status filter
      await retry.try(async () => {
        const upcomingList = await pageObjects.maintenanceWindows.getMaintenanceWindowsList();
        expect(upcomingList.length).to.equal(1);
        expect(upcomingList[0].status).to.equal('Upcoming');
      });
    });
  });
};
