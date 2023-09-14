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
  const browser = getService('browser');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const tinesConnectorName = 'my-tines-connector';
  let simulatorUrl: string;
  let editSimulatorUrl: string;
  let tinesConnectorId: string;

  // isEnabled helper uses "disabled" attribute, testSubjects.isEnabled() gives inconsistent results for comboBoxes.
  const isEnabled = async (selector: string) =>
    testSubjects.getAttribute(selector, 'disabled').then((disabled) => disabled !== 'true');

  describe('tines connector', function () {
    before(async () => {
      simulatorUrl = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.TINES)
      );
      editSimulatorUrl = simulatorUrl.replace('/elastic:changeme@', '/');
      ({ id: tinesConnectorId } = await actions.api.createConnector({
        name: tinesConnectorName,
        config: {
          url: simulatorUrl,
        },
        secrets: {
          email: 'test@foo.com',
          token: 'apiToken',
        },
        connectorTypeId: '.tines',
      }));
    });

    beforeEach(async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await actions.api.deleteConnector(tinesConnectorId);
    });

    it('tines connector screenshots', async () => {
      await pageObjects.common.navigateToApp('connectors');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await actions.common.openNewConnectorForm('tines');
      await testSubjects.setValue('nameInput', 'Tines test connector');
      await testSubjects.setValue('config.url-input', editSimulatorUrl);
      await testSubjects.setValue('secrets.email-input', 'test@example.com');
      await testSubjects.setValue('secrets.token-input', 'tester');
      await commonScreenshots.takeScreenshot('tines-connector', screenshotDirectories);
      await testSubjects.click('create-connector-flyout-save-test-btn');
      await pageObjects.common.clearAllToasts();
      await commonScreenshots.takeScreenshot('tines-params-test', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });

    // Try copying the other functional test method to test storylines
    it('tines connector test screenshots', async () => {
      const searchBox = await find.byCssSelector('[data-test-subj="actionsList"] .euiFieldSearch');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type('my actionTypeId:(.tines)');
      await searchBox.pressKeys(browser.keys.ENTER);
      const connectorList = await testSubjects.find('actionsTable');
      const tinesConnector = await connectorList.findByCssSelector(
        `[title="${tinesConnectorName}"]`
      );
      await tinesConnector.click();
      await testSubjects.click('testConnectorTab');
      await retry.waitFor('stories to load values', async () => isEnabled('tines-storySelector'));
      await testSubjects.click('tines-storySelector');
      // await comboBox.set('tines-storySelector', tinesStory1.name);
      await commonScreenshots.takeScreenshot('test-story-selector', screenshotDirectories);
      await testSubjects.click('euiFlyoutCloseButton');
    });
  });
}
