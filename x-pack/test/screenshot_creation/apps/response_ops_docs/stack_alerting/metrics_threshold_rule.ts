/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { metricThresholdRuleName } from '.';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const actions = getService('actions');
  const browser = getService('browser');
  const commonScreenshots = getService('commonScreenshots');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'stack_alerting'];
  const emailConnectorName = 'Email connector 1';

  describe('metric threshold rule', function () {
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

    after(async () => {
      await actions.api.deleteConnector(emailConnectorId);
    });

    it('example metric threshold rule conditions and actions', async () => {
      await pageObjects.common.navigateToApp('triggersActions');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('ruleSearchField', metricThresholdRuleName);
      await browser.pressKeys(browser.keys.ENTER);
      const actionPanel = await testSubjects.find('collapsedItemActions');
      await actionPanel.click();
      const editRuleMenu = await testSubjects.find('editRule');
      await editRuleMenu.click();
      const expandExpression = await testSubjects.find('expandRow');
      await expandExpression.click();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'rule-flyout-rule-conditions',
        screenshotDirectories,
        1400,
        1500
      );

      const serverLogAction = await testSubjects.find('alertActionAccordion-0');
      const removeConnectorButton = await serverLogAction.findByCssSelector(
        '[aria-label="Delete"]'
      );
      await removeConnectorButton.click();

      await testSubjects.click('.email-alerting-ActionTypeSelectOption');
      await testSubjects.scrollIntoView('addAlertActionButton');
      await commonScreenshots.takeScreenshot(
        'rule-flyout-action-details',
        screenshotDirectories,
        1400,
        1024
      );
      await testSubjects.scrollIntoView('addAlertActionButton');
      await testSubjects.click('messageAddVariableButton');
      await commonScreenshots.takeScreenshot(
        'rule-flyout-action-variables',
        screenshotDirectories,
        1400,
        1024
      );

      const cancelEditButton = await testSubjects.find('cancelSaveEditedRuleButton');
      await cancelEditButton.click();
      const confirmCancelButton = await testSubjects.find('confirmModalConfirmButton');
      await confirmCancelButton.click();
    });
  });
}
