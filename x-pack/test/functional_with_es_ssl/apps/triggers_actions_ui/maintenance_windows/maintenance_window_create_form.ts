/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');
  const toasts = getService('toasts');
  const objectRemover = new ObjectRemover(supertest);

  describe('Maintenance window create form', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
    });

    after(async () => {
      const { body } = await supertest.get('/internal/alerting/rules/maintenance_window/_find');

      body?.data?.forEach((mw: { id: string }) => {
        objectRemover.add(mw.id, 'rules/maintenance_window', 'alerting', true);
      });

      await objectRemover.removeAll();
    });

    it('should create a maintenance window', async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();

      await testSubjects.click('mw-create-button');

      await retry.try(async () => {
        await testSubjects.existOrFail('createMaintenanceWindowForm');
      });

      const nameInput = await testSubjects.find('createMaintenanceWindowFormNameInput');

      nameInput.click();
      nameInput.type('Test Maintenance Window');

      // Turn on repeat
      (await testSubjects.find('createMaintenanceWindowRepeatSwitch')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('recurringScheduleRepeatSelect');
      });

      // Open the repeat dropdown select
      (await testSubjects.find('recurringScheduleRepeatSelect')).click();
      // Select custom
      (await testSubjects.find('recurringScheduleOptionCustom')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('customRecurringScheduleFrequencySelect');
      });

      // Change interval to 2
      const intervalInput = await testSubjects.find('customRecurringScheduleIntervalInput');

      intervalInput.click();
      intervalInput.type('2');

      // Open "every" frequency dropdown
      (await testSubjects.find('customRecurringScheduleFrequencySelect')).click();
      // Select daily
      (await testSubjects.find('customFrequencyDaily')).click();
      // Click on "End -> after {X}"
      (await testSubjects.find('recurrenceEndOptionAfterX')).click();

      await retry.try(async () => {
        await testSubjects.existOrFail('count-field');
      });

      const afterXOccurenceInput = await testSubjects.find('recurringScheduleAfterXOccurenceInput');

      afterXOccurenceInput.click();
      afterXOccurenceInput.clearValue();
      afterXOccurenceInput.type('5');

      (await testSubjects.find('create-submit')).click();

      await retry.try(async () => {
        const toastTitle = await toasts.getTitleAndDismiss();
        expect(toastTitle).to.eql(`Created maintenance window 'Test Maintenance Window'`);
      });
    });
  });
};
