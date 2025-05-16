/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const TEST_SCRIPT = `return 1;`;
const TEST_SCRIPT_REQUEST = `POST _scripts/painless/_execute
{
  "script": {
    "source": """${TEST_SCRIPT}""",
    "params": {
      "string_parameter": "string value",
      "number_parameter": 1.5,
      "boolean_parameter": true
    }
  }
}`;
const TEST_SCRIPT_RESPONSE = `"1"`;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const monacoEditor = getService('monacoEditor');

  describe('Painless lab', function describeIndexTests() {
    before(async () => {
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/painless_lab' });
      await retry.waitFor('Wait for editor to be visible', async () => {
        return testSubjects.isDisplayed('painless_lab');
      });
      // replace the default script with a simpler one
      await monacoEditor.setCodeEditorValue(TEST_SCRIPT);
    });

    it('click show API request button and flyout should appear in page', async () => {
      await testSubjects.click('btnViewRequest');
      await testSubjects.existOrFail('painlessLabRequestFlyoutHeader', { timeout: 10 * 1000 });
    });

    it('validate request body is the expected', async () => {
      const requestText = await testSubjects.getVisibleText('painlessLabFlyoutRequest');
      expect(requestText).equal(TEST_SCRIPT_REQUEST);
    });

    it('validate response body is the expected', async () => {
      await find.clickByCssSelector('#response');
      await retry.waitFor('Wait for response to change', async () => {
        return (
          (await testSubjects.getVisibleText('painlessLabFlyoutResponse')) === TEST_SCRIPT_RESPONSE
        );
      });
    });
  });
}
