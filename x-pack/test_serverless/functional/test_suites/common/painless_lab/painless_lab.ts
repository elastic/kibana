/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const TEST_SCRIPT_RESULT = 45;
const TEST_SCRIPT = `
int total = 0;

for (int i = 0; i < 10; ++i) {
  total += i;
}

return total;
`.trim();

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header', 'svlCommonPage']);
  const testSubjects = getService('testSubjects');
  const monacoEditor = getService('monacoEditor');

  describe('Painless lab', function describeIndexTests() {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/painless_lab' });
      await retry.waitFor('Wait for editor to be visible', async () => {
        return testSubjects.isDisplayed('painless_lab');
      });
    });

    it('should show the editor and preview panels', async () => {
      const editor = await testSubjects.find('kibanaCodeEditor');
      const preview = await testSubjects.find('painlessTabs');

      expect(await editor.isDisplayed()).to.be(true);
      expect(await preview.isDisplayed()).to.be(true);
    });

    it('executes the script and shows the right result', async () => {
      await monacoEditor.setCodeEditorValue(TEST_SCRIPT);

      await retry.try(async () => {
        const result = await testSubjects.find('painlessTabs');
        expect(await result.getVisibleText()).to.contain(TEST_SCRIPT_RESULT.toString());
      });
    });
  });
}
