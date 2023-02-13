/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const transform = getService('transform');
  const commonScreenshots = getService('commonScreenshots');
  const screenshotDirectories = ['ml_docs', 'transforms'];
  const pageObjects = getPageObjects(['triggersActionsUI']);
  const testSubjects = getService('testSubjects');
  const ENTER_KEY = '\uE007';

  describe('transform alerts', function () {
    it('transform rule screenshot', async () => {
      await transform.testExecution.logTestStep('navigate to stack management rules');
      await transform.navigation.navigateToRules();
      await pageObjects.triggersActionsUI.clickCreateAlertButton();
      await transform.alerting.setRuleName('transform-health-rule');
      await transform.testExecution.logTestStep('search for transform rule type');
      const searchBox = await testSubjects.find('ruleSearchField');
      await searchBox.click();
      await searchBox.clearValue();
      await searchBox.type('transform');
      await searchBox.pressKeys(ENTER_KEY);
      await transform.testExecution.logTestStep('take screenshot');
      await commonScreenshots.takeScreenshot('transform-rule', screenshotDirectories);
      await transform.testExecution.logTestStep('select transform rule type');
      await transform.alerting.selectTransformAlertType();
      await transform.testExecution.logTestStep('take screenshot');
      await commonScreenshots.takeScreenshot('transform-check-config', screenshotDirectories);
    });
  });
}
