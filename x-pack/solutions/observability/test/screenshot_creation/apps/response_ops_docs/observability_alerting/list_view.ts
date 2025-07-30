/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { inventoryRuleName } from '.';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const commonScreenshots = getService('commonScreenshots');
  const observability = getService('observability');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'observability_alerting'];
  const testSubjects = getService('testSubjects');

  describe('list view', function () {
    it('observability rules list screenshot', async () => {
      await observability.alerts.common.navigateToRulesPage();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.setValue('ruleSearchField', inventoryRuleName);
      await browser.pressKeys(browser.keys.ENTER);
      await commonScreenshots.takeScreenshot(
        'create-alerts-manage-rules',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
