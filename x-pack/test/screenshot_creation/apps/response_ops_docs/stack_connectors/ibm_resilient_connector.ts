/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const actions = getService('actions');
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');

  let resilientSimulatorUrl: string = '<could not determine kibana url>';
  let smallUrl: string;

  describe('ibm resilient connector', function () {
    before(async () => {
      resilientSimulatorUrl = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.RESILIENT)
      );
      smallUrl = resilientSimulatorUrl.replace('/elastic:changeme@', '/');
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('ibm resilient connector creation screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('resilient');
      await testSubjects.setValue('nameInput', 'IBM Resilient test connector');
      await testSubjects.setValue('config.apiUrl-input', smallUrl);
      await testSubjects.setValue('config.orgId-input', '201');
      await testSubjects.setValue('secrets.apiKeyId-input', 'tester');
      await testSubjects.setValue('secrets.apiKeySecret-input', 'testkey');
      await commonScreenshots.takeScreenshot('resilient-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      // Close all toasts since it is unable to get incident types from example site
      await toasts.dismissAll();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await toasts.dismissAll();
      await commonScreenshots.takeScreenshot('resilient-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
