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

  async function defineAlwaysFiringAlert(alertName: string) {
    await pageObjects.triggersActionsUI.clickCreateAlertButton();
    await testSubjects.setValue('alertNameInput', alertName);
    await testSubjects.click('test.always-firing-SelectOption');
  }

  // FLAKY: https://github.com/elastic/kibana/issues/85105
  describe.skip('create alert', function () {
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
      expect(await messageTextArea.getAttribute('value')).to.eql(
        `alert '{{alertName}}' is active for group '{{context.group}}':

- Value: {{context.value}}
- Conditions Met: {{context.conditions}} over {{params.timeWindowSize}}{{params.timeWindowUnit}}
- Timestamp: {{context.date}}`
      );
      await testSubjects.setValue('messageTextArea', 'test message ');
      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-alertActionGroup');
      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alertActionGroup}}'
      );
      await messageTextArea.type(' some additional text ');

      await testSubjects.click('messageAddVariableButton');
      await testSubjects.click('variableMenuButton-alertId');

      expect(await messageTextArea.getAttribute('value')).to.eql(
        'test message {{alertActionGroup}} some additional text {{alertId}}'
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

    it('should create an alert with actions in multiple groups', async () => {
      const alertName = generateUniqueKey();
      await defineAlwaysFiringAlert(alertName);

      // create Slack connector and attach an action using it
      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.click('addNewActionConnectorButton-.slack');
      const slackConnectorName = generateUniqueKey();
      await testSubjects.setValue('nameInput', slackConnectorName);
      await testSubjects.setValue('slackWebhookUrlInput', 'https://test');
      await find.clickByCssSelector('[data-test-subj="saveActionButtonModal"]:not(disabled)');
      const createdConnectorToastTitle = await pageObjects.common.closeToast();
      expect(createdConnectorToastTitle).to.eql(`Created '${slackConnectorName}'`);
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-0"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addAlertActionButton');
      await testSubjects.click('.slack-ActionTypeSelectOption');
      await testSubjects.setValue('messageTextArea', 'test message ');
      await (
        await find.byCssSelector(
          '[data-test-subj="alertActionAccordion-1"] [data-test-subj="messageTextArea"]'
        )
      ).type('some text ');

      await testSubjects.click('addNewActionConnectorActionGroup-1');
      await testSubjects.click('addNewActionConnectorActionGroup-1-option-other');

      await testSubjects.click('saveAlertButton');
      const toastTitle = await pageObjects.common.closeToast();
      expect(toastTitle).to.eql(`Created alert "${alertName}"`);
      await pageObjects.triggersActionsUI.searchAlerts(alertName);
      const searchResultsAfterSave = await pageObjects.triggersActionsUI.getAlertsList();
      expect(searchResultsAfterSave).to.eql([
        {
          name: alertName,
          tagsText: '',
          alertType: 'Always Firing',
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
  });
};
