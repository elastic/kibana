/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { times } from 'lodash';
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

  async function createAlert(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send({
        enabled: true,
        name: generateUniqueKey(),
        tags: ['foo', 'bar'],
        alertTypeId: 'test.noop',
        consumer: 'alerts',
        schedule: { interval: '1m' },
        throttle: '1m',
        actions: [],
        params: {},
        ...overwrites,
      })
      .expect(200);
    return createdAlert;
  }

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

  describe('alerts', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('alertsTab');
    });

    it('should create an alert', async () => {
      const alertName = generateUniqueKey();
      await defineAlert(alertName);

      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      const messageTextArea = await find.byCssSelector('[data-test-subj="messageTextArea"]');
      expect(await messageTextArea.getAttribute('value')).to.eql('alert {{alertName}} group {{context.group}} value {{context.value}} exceeded threshold {{context.function}} over {{params.timeWindowSize}}{{params.timeWindowUnit}} on {{context.date}}');
      await testSubjects.setValue('messageTextArea', 'test message ');
      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-0');
      expect(await messageTextArea.getAttribute('value')).to.eql('test message {{alertId}}');
      await messageTextArea.type(' some additional text ');

      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-1');

      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alertId}} some additional text {{alertInstanceId}}'
      );

      await testSubjects.click('saveAlertButton');
      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created alert "${alertName}"`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterSave).to.eql([
        {
          name: alertName,
          tagsText: '',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);

      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should show save confirmation before creating alert with no actions', async () => {
      const alertName = generateUniqueKey();
      await defineAlert(alertName);

      await testSubjects.click('saveAlertButton');
      await testSubjects.existOrFail('confirmAlertSaveModal');
      await testSubjects.click('confirmAlertSaveModal > confirmModalCancelButton');
      await testSubjects.missingOrFail('confirmAlertSaveModal');
      await find.existsByCssSelector('[data-test-subj="saveAlertButton"]:not(disabled)');

      await testSubjects.click('saveAlertButton');
      await testSubjects.existOrFail('confirmAlertSaveModal');
      await testSubjects.click('confirmAlertSaveModal > confirmModalConfirmButton');
      await testSubjects.missingOrFail('confirmAlertSaveModal');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created alert "${alertName}"`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterSave).to.eql([
        {
          name: alertName,
          tagsText: '',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);

      // clean up created alert
      const alertsToDelete = await getAlertsByName(alertName);
      await deleteAlerts(alertsToDelete.map((alertItem: { id: string }) => alertItem.id));
    });

    it('should display alerts in alphabetical order', async () => {
      const uniqueKey = generateUniqueKey();
      const a = await createAlert({ name: 'b', tags: [uniqueKey] });
      const b = await createAlert({ name: 'c', tags: [uniqueKey] });
      const c = await createAlert({ name: 'a', tags: [uniqueKey] });

      await pageObjects.triggersActionsUI.searchAlerts(uniqueKey);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(3);
      expect(searchResults[0].name).to.eql('a');
      expect(searchResults[1].name).to.eql('b');
      expect(searchResults[2].name).to.eql('c');

      await deleteAlerts([a.id, b.id, c.id]);
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should search for tags', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should display an empty list when search did not return any alerts', async () => {
      await pageObjects.triggersActionsUI.searchAlerts(`An Alert That For Sure Doesn't Exist!`);

      expect(await pageObjects.triggersActionsUI.isAlertsListDisplayed()).to.eql(true);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('disableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const disableSwitchAfterDisable = await testSubjects.find('disableSwitch');
      const isChecked = await disableSwitchAfterDisable.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
      await deleteAlerts([createdAlert.id]);
    });

    it('should re-enable single alert', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should mute single alert', async () => {
      const createdAlert = await createAlert();
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('muteSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const muteSwitchAfterMute = await testSubjects.find('muteSwitch');
      const isChecked = await muteSwitchAfterMute.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
      await deleteAlerts([createdAlert.id]);
    });

    it('should unmute single alert', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should delete single alert', async () => {
      const firstAlert = await createAlert();
      const secondAlert = await createAlert();
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
      await deleteAlerts([firstAlert.id]);
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should unmute all selection', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should disable all selection', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should enable all selection', async () => {
      const createdAlert = await createAlert();
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
      await deleteAlerts([createdAlert.id]);
    });

    it('should delete all selection', async () => {
      const namePrefix = generateUniqueKey();
      let count = 0;
      const createdAlertsFirstPage = await Promise.all(
        times(2, () => createAlert({ name: `${namePrefix}-0${count++}` }))
      );

      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);

      for (const createdAlert of createdAlertsFirstPage) {
        await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);
      }

      await testSubjects.click('bulkAction');

      await testSubjects.click('deleteAll');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await retry.tryForTime(30000, async () => {
        const toastTitle = await pageObjects.common.closeToast();
        expect(toastTitle).to.eql('Deleted 2 alerts');
      });

      await pageObjects.triggersActionsUI.searchAlerts(namePrefix);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete).to.have.length(0);
    });
  });
};
