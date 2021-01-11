/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { ObjectRemover } from '../../lib/object_remover';
import { generateUniqueKey, getTestAlertData, getTestActionData } from '../../lib/get_test_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const supertest = getService('supertest');
  const retry = getService('retry');
  const objectRemover = new ObjectRemover(supertest);

  async function createAlertManualCleanup(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send(getTestAlertData(overwrites))
      .expect(200);
    return createdAlert;
  }

  async function createFailingAlert() {
    return await createAlert({
      alertTypeId: 'test.failing',
      schedule: { interval: '30s' },
    });
  }

  async function createAlert(overwrites: Record<string, any> = {}) {
    const createdAlert = await createAlertManualCleanup(overwrites);
    objectRemover.add(createdAlert.id, 'alert', 'alerts');
    return createdAlert;
  }

  async function createAction(overwrites: Record<string, any> = {}) {
    const { body: createdAction } = await supertest
      .post(`/api/actions/action`)
      .set('kbn-xsrf', 'foo')
      .send(getTestActionData(overwrites))
      .expect(200);
    objectRemover.add(createdAction.id, 'action', 'actions');
    return createdAction;
  }

  async function refreshAlertsList() {
    await testSubjects.click('alertsTab');
  }

  // Failing: See https://github.com/elastic/kibana/issues/87105
  describe.skip('alerts list', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('alertsTab');
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('should display alerts in alphabetical order', async () => {
      const uniqueKey = generateUniqueKey();
      await createAlert({ name: 'b', tags: [uniqueKey] });
      await createAlert({ name: 'c', tags: [uniqueKey] });
      await createAlert({ name: 'a', tags: [uniqueKey] });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(uniqueKey);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(3);
      expect(searchResults[0].name).to.eql('a');
      expect(searchResults[1].name).to.eql('b');
      expect(searchResults[2].name).to.eql('c');
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
    });

    it('should search for tags', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`${createdAlert.name} foo`);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Test: Noop',
          interval: '1m',
        },
      ]);
    });

    it('should display an empty list when search did not return any alerts', async () => {
      await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(`An Alert That For Sure Doesn't Exist!`);

      expect(await pageObjects.triggersActionsUI.isAlertsListDisplayed()).to.eql(true);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('disableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const disableSwitchAfterDisable = await testSubjects.find('disableSwitch');
      const isChecked = await disableSwitchAfterDisable.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should re-enable single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('disableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('disableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const disableSwitchAfterReEnable = await testSubjects.find('disableSwitch');
      const isChecked = await disableSwitchAfterReEnable.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should mute single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('muteSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const muteSwitchAfterMute = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitchAfterMute.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should unmute single alert', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('muteSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('muteSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const muteSwitchAfterUnmute = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitchAfterUnmute.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should delete single alert', async () => {
      await createAlert();
      const secondAlert = await createAlertManualCleanup();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('deleteAlert');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 alert');
      });

      await pageObjects.triggersActionsUI.searchAlerts(secondAlert.name);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('muteAll');

      // Unmute all button shows after clicking mute all
      await testSubjects.existOrFail('unmuteAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const muteSwitch = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should unmute all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('muteAll');

      await testSubjects.click('unmuteAll');

      // Mute all button shows after clicking unmute all
      await testSubjects.existOrFail('muteAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const muteSwitch = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('disableAll');

      // Enable all button shows after clicking disable all
      await testSubjects.existOrFail('enableAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const disableSwitch = await testSubjects.find('disableSwitch');
      const isChecked = await disableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert();
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('disableAll');

      await testSubjects.click('enableAll');

      // Disable all button shows after clicking enable all
      await testSubjects.existOrFail('disableAll');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const disableSwitch = await testSubjects.find('disableSwitch');
      const isChecked = await disableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should delete all selection', async () => {
      const namePrefix = generateUniqueKey();
      const createdAlert = await createAlertManualCleanup({ name: `${namePrefix}-1` });
      await refreshAlertsList();
      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('deleteAll');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await retry.try(async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 1 alert');
      });

      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete).to.have.length(0);
    });

    it('should filter alerts by the status', async () => {
      await createAlert();
      const failingAlert = await createFailingAlert();
      // initialy alert get Pending status, so we need to retry refresh list logic to get the post execution statuses
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults.map((item: any) => item.status).sort()).to.eql(['Error', 'Ok']);
      });
      await testSubjects.click('alertStatusFilterButton');
      await testSubjects.click('alertStatuserrorFilerOption'); // select Error status filter
      await retry.try(async () => {
        const filterErrorOnlyResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(filterErrorOnlyResults).to.eql([
          {
            name: failingAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Failing',
            interval: '30s',
            status: 'Error',
          },
        ]);
      });
    });

    it('should display total alerts by status and error banner only when exists alerts with status error', async () => {
      const createdAlert = await createAlert();
      await retry.try(async () => {
        await refreshAlertsList();
        const refreshResults = await pageObjects.triggersActionsUI.getAlertsListWithStatus();
        expect(refreshResults).to.eql([
          {
            name: createdAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Noop',
            interval: '1m',
            status: 'Ok',
          },
        ]);
      });

      const alertsErrorBannerWhenNoErrors = await find.allByCssSelector(
        '[data-test-subj="alertsErrorBanner"]'
      );
      expect(alertsErrorBannerWhenNoErrors).to.have.length(0);

      await createFailingAlert();
      await retry.try(async () => {
        await refreshAlertsList();
        const alertsErrorBannerExistErrors = await find.allByCssSelector(
          '[data-test-subj="alertsErrorBanner"]'
        );
        expect(alertsErrorBannerExistErrors).to.have.length(1);
        expect(
          await (
            await alertsErrorBannerExistErrors[0].findByCssSelector('.euiCallOutHeader')
          ).getVisibleText()
        ).to.equal('Error found in 1 alert.');
      });

      expect(await testSubjects.getVisibleText('totalAlertsCount')).to.be(
        'Showing: 2 of 2 alerts.'
      );
      expect(await testSubjects.getVisibleText('totalActiveAlertsCount')).to.be('Active: 0');
      expect(await testSubjects.getVisibleText('totalOkAlertsCount')).to.be('Ok: 1');
      expect(await testSubjects.getVisibleText('totalErrorAlertsCount')).to.be('Error: 1');
      expect(await testSubjects.getVisibleText('totalPendingAlertsCount')).to.be('Pending: 0');
      expect(await testSubjects.getVisibleText('totalUnknownAlertsCount')).to.be('Unknown: 0');
    });

    it('should filter alerts by the alert type', async () => {
      await createAlert();
      const failingAlert = await createFailingAlert();
      await refreshAlertsList();
      await testSubjects.click('alertTypeFilterButton');
      expect(await (await testSubjects.find('alertType0Group')).getVisibleText()).to.eql('Alerts');
      await testSubjects.click('alertTypetest.failingFilterOption');

      await retry.try(async () => {
        const filterFailingAlertOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterFailingAlertOnlyResults).to.eql([
          {
            name: failingAlert.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Failing',
            interval: '30s',
          },
        ]);
      });
    });

    it('should filter alerts by the action type', async () => {
      await createAlert();
      const action = await createAction();
      const noopAlertWithAction = await createAlert({
        actions: [
          {
            id: action.id,
            actionTypeId: '.slack',
            group: 'default',
            params: { level: 'info', message: 'gfghfhg' },
          },
        ],
      });
      await refreshAlertsList();
      await testSubjects.click('actionTypeFilterButton');
      await testSubjects.click('actionType.slackFilterOption');

      await retry.try(async () => {
        const filterWithSlackOnlyResults = await pageObjects.triggersActionsUI.getAlertsList();
        expect(filterWithSlackOnlyResults).to.eql([
          {
            name: noopAlertWithAction.name,
            tagsText: 'foo, bar',
            alertType: 'Test: Noop',
            interval: '1m',
          },
        ]);
      });
    });
  });
};
