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
  const comboBox = getService('comboBox');
  const es = getService('es');
  const testIndex = `test-index`;
  const indexDocument =
    `{\n` +
    `"rule_id": "{{rule.id}}",\n` +
    `"rule_name": "{{rule.name}}",\n` +
    `"alert_id": "{{alert.id}}",\n` +
    `"context_message": "{{context.message}}"\n`;

  describe('connector types', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
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
      await es.indices.create({
        index: testIndex,
        body: {
          mappings: {
            properties: {
              date_updated: {
                type: 'date',
                format: 'epoch_millis',
              },
            },
          },
        },
      });
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
    after(async () => {
      await es.indices.delete({ index: testIndex });
    });
  });
}
