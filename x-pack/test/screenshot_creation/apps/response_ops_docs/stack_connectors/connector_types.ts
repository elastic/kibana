/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header']);
  const actions = getService('actions');
  const browser = getService('browser');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const testIndex = `test-index`;
  const indexDocument =
    `{\n` +
    `"rule_id": "{{rule.id}}",\n` +
    `"rule_name": "{{rule.name}}",\n` +
    `"alert_id": "{{alert.id}}",\n` +
    `"context_message": "{{context.message}}"\n`;
  const webhookJson =
    `{\n` +
    `"short_description": "{{context.rule.name}}",\n` +
    `"description": "{{context.rule.description}}"`;
  const emailConnectorName = 'my-email-connector';

  describe('connector types', function () {
    let emailConnectorId: string;
    before(async () => {
      ({ id: emailConnectorId } = await actions.api.createConnector({
        name: emailConnectorName,
        config: {
          service: 'other',
          from: 'bob@example.com',
          host: 'some.non.existent.com',
          port: 25,
        },
        secrets: {
          user: 'bob',
          password: 'supersecret',
        },
        connectorTypeId: '.email',
      }));
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await actions.api.deleteConnector(emailConnectorId);
    });

    it('server log connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('server-log');
      await testSubjects.setValue('nameInput', 'Server log test connector');
      await commonScreenshots.takeScreenshot('serverlog-connector', screenshotDirectories);
      const saveTestButton = await testSubjects.find('create-connector-flyout-save-test-btn');
      await saveTestButton.click();
      await commonScreenshots.takeScreenshot('serverlog-params-test', screenshotDirectories);
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
    });

    it('index connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('index');
      await testSubjects.setValue('nameInput', 'Index test connector');
      await comboBox.set('connectorIndexesComboBox', testIndex);
      const timeFieldToggle = await testSubjects.find('hasTimeFieldCheckbox');
      await timeFieldToggle.click();
      await commonScreenshots.takeScreenshot('index-connector', screenshotDirectories);
      const saveTestButton = await testSubjects.find('create-connector-flyout-save-test-btn');
      await saveTestButton.click();
      await testSubjects.setValue('actionJsonEditor', indexDocument);
      await commonScreenshots.takeScreenshot('index-params-test', screenshotDirectories);
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
    });

    it('slack api connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('slack');
      await testSubjects.click('.slack_apiButton');
      await testSubjects.setValue('nameInput', 'Slack api test connector');
      await testSubjects.setValue('secrets.token-input', 'xoxb-XXXX-XXXX-XXXX');
      await commonScreenshots.takeScreenshot('slack-api-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await pageObjects.common.closeToast();
      await commonScreenshots.takeScreenshot('slack-api-params', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('slack webhook connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('slack');
      await testSubjects.setValue('nameInput', 'Slack webhook test connector');
      await testSubjects.setValue(
        'slackWebhookUrlInput',
        'https://hooks.slack.com/services/abcd/ljklmnopqrstuvwxz'
      );
      await commonScreenshots.takeScreenshot('slack-webhook-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot('slack-webhook-params', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('email connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('email');
      await testSubjects.setValue('nameInput', 'Gmail connector');
      await testSubjects.setValue('emailFromInput', 'test@gmail.com');
      await testSubjects.setValue('emailServiceSelectInput', 'gmail');
      await commonScreenshots.takeScreenshot('email-connector', screenshotDirectories);
      const flyOutCancelButton = await testSubjects.find('euiFlyoutCloseButton');
      await flyOutCancelButton.click();
    });

    it('test email connector screenshots', async () => {
      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type('my actionTypeId:(.email)');
      await searchBox.pressKeys(browser.keys.ENTER);
      const connectorList = await testSubjects.find('actionsTable');
      const emailConnector = await connectorList.findByCssSelector(
        `[title="${emailConnectorName}"]`
      );
      await emailConnector.click();
      const testButton = await testSubjects.find('testConnectorTab');
      await testButton.click();
      await testSubjects.setValue('comboBoxSearchInput', 'elastic@gmail.com');
      await testSubjects.setValue('subjectInput', 'Test subject');
      await testSubjects.setValue('messageTextArea', 'Enter message text');
      /* timing issue sometimes happens with the combobox so we just try to set the subjectInput again */
      await testSubjects.setValue('subjectInput', 'Test subject');
      await commonScreenshots.takeScreenshot(
        'email-params-test',
        screenshotDirectories,
        1400,
        1024
      );
    });

    it('webhook connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('webhook');
      await testSubjects.setValue('nameInput', 'Webhook test connector');
      await testSubjects.setValue('webhookUrlText', 'https://example.com');
      await testSubjects.setValue('webhookUserInput', 'testuser');
      await testSubjects.setValue('webhookPasswordInput', 'password');
      await commonScreenshots.takeScreenshot('webhook-connector', screenshotDirectories);
      const saveTestButton = await testSubjects.find('create-connector-flyout-save-test-btn');
      await saveTestButton.click();
      await testSubjects.setValue('actionJsonEditor', webhookJson);
      await commonScreenshots.takeScreenshot('webhook-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    it('generative ai connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('gen-ai');
      await testSubjects.setValue('nameInput', 'OpenAI test connector');
      await testSubjects.setValue('secrets.apiKey-input', 'testkey');
      await commonScreenshots.takeScreenshot('gen-ai-connector', screenshotDirectories, 1920, 1200);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot('gen-ai-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
