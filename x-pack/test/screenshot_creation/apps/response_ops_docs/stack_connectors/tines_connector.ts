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

  describe('tines connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('tines connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('tines');
      await testSubjects.setValue('nameInput', 'Tines test connector');
      await testSubjects.setValue('config.url-input', 'https://tenant.tines.com/webhook/example');
      await testSubjects.setValue('secrets.email-input', 'test@example.com');
      await testSubjects.setValue('secrets.token-input', 'tester');
      await commonScreenshots.takeScreenshot('tines-connector', screenshotDirectories);
      // await testSubjects.click('create-connector-flyout-save-test-btn');
      // await testSubjects.click('toastCloseButton');
      // await pageObjects.common.closeToast();
      // await commonScreenshots.takeScreenshot('tines-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
