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

  async function createAlert(overwrites: Record<string, any> = {}) {
    const { body: createdAlert } = await supertest
      .post(`/api/alert`)
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

  // FLAKY: https://github.com/elastic/kibana/issues/62472
  describe.skip('alerts', function() {
    before(async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await testSubjects.click('alertsTab');
    });

    it('should create an alert', async () => {
      const alertName = generateUniqueKey();
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      const nameInput = await testSubjects.find('alertNameInput');
      await nameInput.click();
      await nameInput.clearValue();
      await nameInput.type(alertName);
      await testSubjects.click('.index-threshold-SelectOption');
      await testSubjects.click('selectIndexExpression');
      const comboBox = await find.byCssSelector('#indexSelectSearchBox');
      await comboBox.click();
      await comboBox.type('k');
      const filterSelectItem = await find.byCssSelector(`.euiFilterSelectItem`);
      await filterSelectItem.click();
      await testSubjects.click('thresholdAlertTimeFieldSelect');
      const fieldOptions = await find.allByCssSelector('#thresholdTimeField option');
      await fieldOptions[1].click();
      // need this two out of popup clicks to close them
      await nameInput.click();

      // test for normal connector
      await testSubjects.click('.webhook-ActionTypeSelectOption');
      const webhookBodyInput = await find.byCssSelector('.ace_text-input');
      await webhookBodyInput.focus();
      await webhookBodyInput.type('{\\"test\\":1}');

      await testSubjects.click('addAlertActionButton');
      // pre-configured connector is loaded an displayed correctly
      await testSubjects.click('.slack-ActionTypeSelectOption');
      expect(await (await find.byCssSelector('#my-slack1')).isDisplayed()).to.be(true);
      const loggingMessageInput = await testSubjects.find('slackMessageTextArea');
      await loggingMessageInput.click();
      await loggingMessageInput.clearValue();
      await loggingMessageInput.type('test message');
      await testSubjects.click('messageAddVariableButton');
      const variableMenuButton = await testSubjects.find('variableMenuButton-0');
      await variableMenuButton.click();
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

    it('should edit an alert', async () => {
      const createdAlert = await createAlert({
        alertTypeId: '.index-threshold',
        name: 'new alert',
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        },
      });
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);
      const editLink = await testSubjects.findAll('alertsTableCell-editLink');
      await editLink[0].click();

      const updatedAlertName = 'Changed Alert Name';
      const nameInputToUpdate = await testSubjects.find('alertNameInput');
      await nameInputToUpdate.click();
      await nameInputToUpdate.clearValue();
      await nameInputToUpdate.type(updatedAlertName);

      await find.clickByCssSelector('[data-test-subj="saveEditedAlertButton"]:not(disabled)');

      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Updated '${updatedAlertName}'`);
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(updatedAlertName);

      const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterEdit).to.eql([
        {
          name: updatedAlertName,
          tagsText: 'foo, bar',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);
    });

    it('should set an alert throttle', async () => {
      const alertName = `edit throttle ${generateUniqueKey()}`;
      const createdAlert = await createAlert({
        alertTypeId: '.index-threshold',
        name: alertName,
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        },
      });
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);

      const editLink = await testSubjects.findAll('alertsTableCell-editLink');
      await editLink[0].click();

      const throttleInputToSetInitialValue = await testSubjects.find('throttleInput');
      await throttleInputToSetInitialValue.click();
      await throttleInputToSetInitialValue.clearValue();
      await throttleInputToSetInitialValue.type('1');

      await find.clickByCssSelector('[data-test-subj="saveEditedAlertButton"]:not(disabled)');

      expect(await pageObjects.common.closeToast()).to.eql(`Updated '${createdAlert.name}'`);

      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      await (await testSubjects.findAll('alertsTableCell-editLink'))[0].click();
      const throttleInput = await testSubjects.find('throttleInput');
      expect(await throttleInput.getAttribute('value')).to.eql('1');
    });

    it('should unset an alert throttle', async () => {
      const alertName = `edit throttle ${generateUniqueKey()}`;
      const createdAlert = await createAlert({
        alertTypeId: '.index-threshold',
        name: alertName,
        throttle: '10m',
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        },
      });
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const searchResults = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResults).to.eql([
        {
          name: createdAlert.name,
          tagsText: 'foo, bar',
          alertType: 'Index threshold',
          interval: '1m',
        },
      ]);

      const editLink = await testSubjects.findAll('alertsTableCell-editLink');
      await editLink[0].click();

      const throttleInputToUnsetValue = await testSubjects.find('throttleInput');

      expect(await throttleInputToUnsetValue.getAttribute('value')).to.eql('10');
      await throttleInputToUnsetValue.click();
      await throttleInputToUnsetValue.clearValueWithKeyboard();

      expect(await throttleInputToUnsetValue.getAttribute('value')).to.eql('');

      await find.clickByCssSelector('[data-test-subj="saveEditedAlertButton"]:not(disabled)');

      expect(await pageObjects.common.closeToast()).to.eql(`Updated '${createdAlert.name}'`);

      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);
      await (await testSubjects.findAll('alertsTableCell-editLink'))[0].click();
      const throttleInput = await testSubjects.find('throttleInput');
      expect(await throttleInput.getAttribute('value')).to.eql('');
    });

    it('should reset alert when canceling an edit', async () => {
      const createdAlert = await createAlert({
        alertTypeId: '.index-threshold',
        name: generateUniqueKey(),
        params: {
          aggType: 'count',
          termSize: 5,
          thresholdComparator: '>',
          timeWindowSize: 5,
          timeWindowUnit: 'm',
          groupBy: 'all',
          threshold: [1000, 5000],
          index: ['.kibana_1'],
          timeField: 'alert',
        },
      });
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      const editLink = await testSubjects.findAll('alertsTableCell-editLink');
      await editLink[0].click();

      const updatedAlertName = 'Changed Alert Name';
      const nameInputToUpdate = await testSubjects.find('alertNameInput');
      await nameInputToUpdate.click();
      await nameInputToUpdate.clearValue();
      await nameInputToUpdate.type(updatedAlertName);

      await testSubjects.click('cancelSaveEditedAlertButton');
      await find.waitForDeletedByCssSelector('[data-test-subj="cancelSaveEditedAlertButton"]');

      const editLinkPostCancel = await testSubjects.findAll('alertsTableCell-editLink');
      await editLinkPostCancel[0].click();

      const nameInputAfterCancel = await testSubjects.find('alertNameInput');
      const textAfterCancel = await nameInputAfterCancel.getAttribute('value');
      expect(textAfterCancel).to.eql(createdAlert.name);
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

      await pageObjects.triggersActionsUI.toggleSwitch('enableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const enableSwitchAfterDisable = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitchAfterDisable.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
    });

    it('should re-enable single alert', async () => {
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('enableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await pageObjects.triggersActionsUI.toggleSwitch('enableSwitch');

      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      const enableSwitchAfterReEnable = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitchAfterReEnable.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
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

      const enableSwitch = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('false');
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

      const enableSwitch = await testSubjects.find('enableSwitch');
      const isChecked = await enableSwitch.getAttribute('aria-checked');
      expect(isChecked).to.eql('true');
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
