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
  const actionBody =
    `{\n` +
    `"model": "gpt-3.5-turbo",\n` +
    `"messages": [{\n` +
    `"role": "user",\n` +
    `"content": "You are a cyber security analyst using Elastic Security. I would like you to evaluate the event below and format your output neatly in markdown syntax. Add your description, an accuracy rating, and a threat rating."\n` +
    `}]`;

  describe('OpenAI connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('OpenAI connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('gen-ai');
      await testSubjects.setValue('nameInput', 'OpenAI test connector');
      await testSubjects.setValue('secrets.apiKey-input', 'testkey');
      await commonScreenshots.takeScreenshot('gen-ai-connector', screenshotDirectories, 1920, 1200);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      const editor = await testSubjects.find('kibanaCodeEditor');
      await editor.clearValue();
      await testSubjects.setValue('kibanaCodeEditor', actionBody, {
        clearWithKeyboard: true,
      });
      await commonScreenshots.takeScreenshot('gen-ai-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
