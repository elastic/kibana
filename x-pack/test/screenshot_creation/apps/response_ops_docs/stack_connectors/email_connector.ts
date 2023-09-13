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
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const emailConnectorName = 'my-email-connector';

  describe('email connector', function () {
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
  });
}
