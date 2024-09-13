/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { createMaintenanceWindow } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'maintenanceWindows', 'header']);
  const retry = getService('retry');
  const toasts = getService('toasts');
  const objectRemover = new ObjectRemover(supertest);
  const browser = getService('browser');

  describe('Maintenance window update form', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should update a maintenance window', async () => {
      const createdMaintenanceWindow = await createMaintenanceWindow({
        name: 'Test Maintenance Window',
        getService,
        overwrite: {
          r_rule: {
            dtstart: new Date().toISOString(),
            tzid: 'UTC',
            freq: 3,
            interval: 12,
            count: 5,
          },
          category_ids: ['management', 'observability', 'securitySolution'],
        },
      });

      objectRemover.add(createdMaintenanceWindow.id, 'rules/maintenance_window', 'alerting', true);

      await browser.refresh();

      await pageObjects.maintenanceWindows.searchMaintenanceWindows('Test Maintenance Window');

      await testSubjects.click('table-actions-popover');
      await testSubjects.click('table-actions-edit');

      await retry.try(async () => {
        await testSubjects.existOrFail('createMaintenanceWindowForm');
      });

      const nameInput = await testSubjects.find('createMaintenanceWindowFormNameInput');

      nameInput.click();
      nameInput.clearValue();
      nameInput.type('Test Maintenance Window updated');

      // Open the repeat dropdown select
      (await testSubjects.find('recurringScheduleRepeatSelect')).click();
      // Select daily
      (await testSubjects.find('recurringScheduleOptionDaily')).click();

      (await testSubjects.find('create-submit')).click();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Updated maintenance window 'Test Maintenance Window updated'`);
      });
    });
  });
};
