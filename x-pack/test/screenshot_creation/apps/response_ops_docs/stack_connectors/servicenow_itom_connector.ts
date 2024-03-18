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

  describe('servicenow itom connector', function () {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('servicenow itom connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('servicenow-itom');
      await testSubjects.setValue('nameInput', 'ServiceNow ITOM test connector');
      await testSubjects.setValue('credentialsApiUrlFromInput', 'https://dev123.service-now.com');
      await testSubjects.click('input');
      await commonScreenshots.takeScreenshot(
        'servicenow-itom-connector-oauth',
        screenshotDirectories,
        1920,
        1400
      );
      await testSubjects.click('input');
      await testSubjects.setValue('connector-servicenow-username-form-input', 'testuser');
      await testSubjects.setValue('connector-servicenow-password-form-input', 'testpassword');
      await commonScreenshots.takeScreenshot(
        'servicenow-itom-connector-basic',
        screenshotDirectories
      );
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await testSubjects.click('toastCloseButton');
      await testSubjects.click('toastCloseButton');
      await commonScreenshots.takeScreenshot(
        'servicenow-itom-params-test',
        screenshotDirectories,
        1920,
        1400
      );
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
