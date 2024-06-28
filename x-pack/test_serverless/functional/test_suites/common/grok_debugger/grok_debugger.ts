/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['svlCommonPage', 'common', 'grokDebugger']);
  const browser = getService('browser');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Grok Debugger', function () {
    before(async () => {
      // Increase window height to ensure "Simulate" button is shown above the
      // fold. Otherwise it can't be clicked by the browser driver.
      await browser.setWindowSize(1600, 1000);
      await security.testUser.setRoles(['global_devtools_read', 'ingest_pipelines_user']);
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/grokdebugger' });
      await retry.waitFor('Grok Debugger Header to be visible', async () => {
        return testSubjects.isDisplayed('grokDebuggerContainer');
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      await retry.waitForWithTimeout('Grok Debugger to be visible', 15000, async () => {
        return await (await PageObjects.grokDebugger.simulateButton()).isDisplayed();
      });
    });

    it('Accept and parse input with built-in grok pattern', async () => {
      const eventInput = 'SegerCommaBob';
      const patternInput = '%{USERNAME:u}';
      const response = await PageObjects.grokDebugger.executeGrokSimulation(
        eventInput,
        patternInput,
        null
      );
      expect(response).to.eql({ u: 'SegerCommaBob' });
    });
  });
};
