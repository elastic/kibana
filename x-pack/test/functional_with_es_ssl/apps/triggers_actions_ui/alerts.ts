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

  async function createAlert(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alerts/alert`)
      .set('kbn-xsrf', 'foo')
      .send({
        enabled: true,
        name: generateUniqueKey(),
        tags: ['foo', 'bar'],
        alertTypeId: 'test.noop',
        consumer: 'test',
        schedule: { interval: '1m' },
        throttle: '1m',
        actions: [],
        params: {},
        ...overwrites,
      })
      .expect(200);
    return createdAlert;
  }

  describe('alerts', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('alertsTab');
    });

    it('should create an alert', async () => {
      const alertName = generateUniqueKey();
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

      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      await testSubjects.setValue('messageTextArea', 'test message ');
      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-0');
      const messageTextArea = await find.byCssSelector('[data-test-subj="messageTextArea"]');
      expect(await messageTextArea.getAttribute('value')).to.eql('test message {{alertId}}');
      await messageTextArea.type(' some additional text ');

      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-1');

      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alertId}} some additional text {{alertName}}'
      );

      await testSubjects.click('saveAlertButton');
      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Saved '${alertName}'`);
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
    });

    it('should display alerts in alphabetical order', async () => {
      const uniqueKey = generateUniqueKey();
      await createAlert({ name: 'b', tags: [uniqueKey] });
      await createAlert({ name: 'c', tags: [uniqueKey] });
      await createAlert({ name: 'a', tags: [uniqueKey] });

      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(uniqueKey);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.have.length(3);
      expect(searchResults[0].name).to.eql('a');
      expect(searchResults[1].name).to.eql('b');
      expect(searchResults[2].name).to.eql('c');
    });

    it('should search for alert', async () => {
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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

    it('should display an empty list when search removes all alerts', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(`An Alert That For Sure Doesn't Exist!`);

      expect(await pageObjects.triggersActionsUI.isAlertsListDisplayed()).to.eql(true);
    });

    it('should disable single alert', async () => {
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('deleteAlert');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql('Deleted 1 alert');
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });

    it('should mute all selection', async () => {
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      await pageObjects.common.navigateToApp('triggersActions');
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
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click(`checkboxSelectRow-${createdAlert.id}`);

      await testSubjects.click('bulkAction');

      await testSubjects.click('deleteAll');
      await testSubjects.existOrFail('deleteIdsConfirmation');
      await testSubjects.click('deleteIdsConfirmation > confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteIdsConfirmation');

      await pageObjects.common.closeToast();

      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      const searchResultsAfterDelete = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterDelete.length).to.eql(0);
    });
  });
};
