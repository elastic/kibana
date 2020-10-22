/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

function generateUniqueKey() {
  return uuid.v4().replace(/-/g, '');
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');

  async function getAlertsByName(name: string) {
    const {
      body: { data: alerts },
    } = await supertest.get(`/api/alerts/_find?search=${name}&search_fields=name`).expect(200);

    return alerts;
  }

  async function deleteAlerts(alertIds: string[]) {
    alertIds.forEach(async (alertId: string) => {
      await supertest.delete(`/api/alerts/alert/${alertId}`).set('kbn-xsrf', 'foo').expect(204, '');
    });
  }

  async function defineAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.setValue('alertNameInput', alertName);
    await testSubjects.click('.index-threshold-SelectOption');
    await testSubjects.click('selectIndexExpression');
    const comboBox = await find.byCssSelector('#indexSelectSearchBox');
    await comboBox.click();
    await comboBox.type('k');
    const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
    await filterSelectItem.click();
    await testSubjects.click('thresholdAlertTimeFieldSelect');
    await retry.try(async () => {
      const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
      expect(fieldOptions[1]).not.to.be(undefined);
      await fieldOptions[1].click();
    });
    await testSubjects.click('closePopover');
    // need this two out of popup clicks to close them
    const nameInput = await testSubjects.find('alertNameInput');
    await nameInput.click();
  }

  describe('create alert', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('alertsTab');
    });

    it('should filter alerts by the status', async () => {
      const alertName = generateUniqueKey();
      await defineAlert(alertName);

      await testSubjects.click('saveAlertButton');
      await testSubjects.existOrFail('confirmAlertSaveModal');
      await testSubjects.click('confirmAlertSaveModal > confirmModalConfirmButton');
      await testSubjects.missingOrFail('confirmAlertSaveModal');

      await pageObjects.common.closeToast();
      // initialy alert get Pending status, which will be changed after the first execution to the Active, Error or Ok
      await testSubjects.click('alertStatusFilterButton');
      await testSubjects.click('alertStatuspendingFilerOption');
      const filterActiveOnlyResults = await pageObjects.triggersActionsUI.getAlertsList(true);
      expect(filterActiveOnlyResults).to.eql([
        {
          alertType: 'Index threshold',
          interval: '1m',
          name: alertName,
          status: 'Pending',
          tagsText: '',
        },
      ]);
      // Unselect Pending filter
      await testSubjects.click('alertStatuspendingFilerOption');

      retry.try(async () => {
        await testSubjects.click('alertStatusokFilerOption');

        const filterOkOnlyResults = await pageObjects.triggersActionsUI.getAlertsList(true);
        expect(filterOkOnlyResults).to.eql([
          {
            status: 'Ok',
            name: alertName,
            tagsText: '',
            alertType: 'Index threshold',
            interval: '1m',
          },
        ]);
      });
      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    /* it('should display error banner when exists alerts with status error', async () => {

    });

    it('should display total alerts by status', async () => {

    });

    it('should filter alerts by the action type', async () => {
      const activeAlert = await createAlert();
      const okAlert = await createAlert();
      const errorAlert = await createAlert();
    });

    it('should filter alerts by the alert type', async () => {
      const activeAlert = await createAlert();
      const okAlert = await createAlert();
      const errorAlert = await createAlert();
    });*/
  });
};
