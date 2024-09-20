/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');

  describe('Painless lab', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/painless_lab' });
      await retry.waitFor('Wait for editor to be visible', async () => {
        return testSubjects.isDisplayed('painless_lab');
      });
    });

    it('click show API request button and flyout should appear in page', async () => {
      await testSubjects.click('btnViewRequest');

      await testSubjects.existOrFail('painlessLabRequestFlyoutHeader', { timeout: 10 * 1000 });
    });

    it('validate request body is not empty', async () => {
      const requestText = await testSubjects.getVisibleText('painlessLabFlyoutRequest');
      expect(requestText.length === 0).to.be(false);
    });

    it('validate response body is not empty', async () => {
      await testSubjects.findService.clickByCssSelector('#response');
      const requestText = await testSubjects.getVisibleText('painlessLabFlyoutResponse');
      expect(requestText.length === 0).to.be(false);
    });
  });
}
