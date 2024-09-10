/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExternalServiceSimulator,
  getExternalServiceSimulatorPath,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['response_ops_docs', 'stack_connectors'];
  const pageObjects = getPageObjects(['common', 'header']);
  const actions = getService('actions');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  let simulatorUrl: string;
  let editSimulatorUrl: string;

  describe('thehive connector', function () {
    before(async () => {
      simulatorUrl = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.THEHIVE)
      );
      editSimulatorUrl = simulatorUrl.replace('/elastic:changeme@', '/');
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('tines connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('thehive');
      await testSubjects.setValue('nameInput', 'TheHive test connector');
      await testSubjects.setValue('config.organisation-input', 'test');
      await testSubjects.setValue('config.url-input', editSimulatorUrl);
      await testSubjects.setValue('secrets.apiKey-input', 'tester');
      await commonScreenshots.takeScreenshot('thehive-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await toasts.dismissAll();
      await commonScreenshots.takeScreenshot('thehive-params-case-test', screenshotDirectories);
      await testSubjects.setValue('eventActionSelect', 'createAlert');
      await commonScreenshots.takeScreenshot('thehive-params-alert-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
