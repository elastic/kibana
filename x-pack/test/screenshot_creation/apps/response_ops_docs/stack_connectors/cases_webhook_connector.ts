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
  const testSubjects = getService('testSubjects');
  const createCaseJson =
    `{\n` +
    `"fields": {\n` +
    `  "summary": {{{case.title}}},\n` +
    `"description": {{{case.description}}},\n` +
    `"labels": {{{case.tags}}},\n` +
    `"project": {"key": "ROC"},\n` +
    `"issueType": {"id": "10024"}\n` +
    `}`;

  describe('webhook case management connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('webhook case management connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('cases-webhook');
      await testSubjects.setValue('nameInput', 'Webhook Case Management test connector');
      await testSubjects.setValue('webhookUserInput', 'testuser@example.com');
      await testSubjects.setValue('webhookPasswordInput', 'password');
      await commonScreenshots.takeScreenshot('cases-webhook-connector', screenshotDirectories);
      await testSubjects.click('casesWebhookNext');
      await testSubjects.setValue(
        'webhookCreateUrlText',
        'https://testing-jira.atlassian.net/rest/api/2/issue'
      );
      await testSubjects.setValue('actionJsonEditor', createCaseJson);
      await testSubjects.setValue('createIncidentResponseKeyText', 'id');
      await commonScreenshots.takeScreenshot(
        'cases-webhook-connector-create-case',
        screenshotDirectories,
        1920,
        1400
      );
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
