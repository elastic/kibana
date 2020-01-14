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

  async function createAlert() {
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
      })
      .expect(200);
    return createdAlert;
  }

  describe('alerts', function() {
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
      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('createActionConnectorButton');
      const connectorNameInput = await testSubjects.find('nameInput');
      await connectorNameInput.click();
      await connectorNameInput.clearValue();
      const connectorName = generateUniqueKey();
      await connectorNameInput.type(connectorName);
      const slackWebhookUrlInput = await testSubjects.find('slackWebhookUrlInput');
      await slackWebhookUrlInput.click();
      await slackWebhookUrlInput.clearValue();
      await slackWebhookUrlInput.type('https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const loggingMessageInput = await testSubjects.find('slackMessageTextArea');
      await loggingMessageInput.click();
      await loggingMessageInput.clearValue();
      await loggingMessageInput.type('test message');
      // TODO: uncomment variables test when server API will be ready
      // await testSubjects.click('slackAddVariableButton');
      // const variableMenuButton = await testSubjects.find('variableMenuButton-0');
      // await variableMenuButton.click();
      await find.clickByCssSelector('[data-test-subj="saveAlertButton"]');
      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Saved '${alertName}'`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterEdit = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterEdit).to.eql([
        {
          name: alertName,
          tagsText: '',
          alertType: 'Index Threshold',
          interval: '1m',
        },
      ]);
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
      const createdAlert = await createAlert();
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.triggersActionsUI.searchAlerts(createdAlert.name);

      await testSubjects.click('collapsedItemActions');

      await testSubjects.click('deleteAlert');
      const emptyPrompt = await find.byCssSelector(
        '[data-test-subj="createFirstAlertEmptyPrompt"]'
      );
      expect(await emptyPrompt.elementHasClass('euiEmptyPrompt')).to.be(true);
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

      const emptyPrompt = await find.byCssSelector(
        '[data-test-subj="createFirstAlertEmptyPrompt"]'
      );
      expect(await emptyPrompt.elementHasClass('euiEmptyPrompt')).to.be(true);
    });
  });
};
