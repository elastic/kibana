/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'grokDebugger']);
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe.only('Grok Debugger', function () {
    before(async () => {
      // await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      // Increase window height to ensure "Simulate" button is shown above the
      // fold. Otherwise it can't be clicked by the browser driver.
      await browser.setWindowSize(1600, 1000);
      await security.testUser.setRoles(['global_devtools_read', 'ingest_pipelines_user']);
      await PageObjects.common.navigateToApp('grokDebugger');
      await retry.waitFor('Grok Debugger Header to be visible', async () => {
        return testSubjects.isDisplayed('grokDebuggerContainer');
      });
    });

    it('Loads the app', async () => {
      await retry.waitForWithTimeout('Grok Debugger to be visible', 15000, async () => {
        return await (await PageObjects.grokDebugger.simulateButton()).isDisplayed();
      });
    });

    it('Accept and parse input with built in grok pattern', async () => {
      const eventInput = 'SegerCommaBob';
      const patternInput = '%{USERNAME:u}';
      const response = await PageObjects.grokDebugger.executeGrokSimulation(
        eventInput,
        patternInput,
        false
      );
      expect(response).to.eql('{\n  "u": "SegerCommaBob"\n}');
    });

    it.skip('Accept and parse input with custom in grok pattern', async () => {
      const eventInput = 'Seger Comma Bob';
      const customPatternInput = '%{FIRSTNAME:f} %{MIDDLENAME:m} %{LASTNAME:l}';

      const response = await PageObjects.grokDebugger.executeGrokSimulation(
        eventInput,
        customPatternInput,
        true
      );
      expect(response).to.eql({ f: 'Seger', m: 'Comma', l: 'Bob' });
    });

    it.skip('applies the correct CSS classes', async () => {
      const grokPattern = '\\[(?:-|%{NUMBER:bytes:int})\\]';

      await grokDebugger.setPatternInput(grokPattern);

      const GROK_START = 'grokStart';
      const GROK_PATTERN_NAME = 'grokPatternName';
      const GROK_SEPARATOR = 'grokSeparator';
      const GROK_FIELD_NAME = 'grokFieldName';
      const GROK_FIELD_TYPE = 'grokFieldType';
      const GROK_END = 'grokEnd';
      const GROK_ESCAPE = 'grokEscape';
      const GROK_ESCAPED = 'grokEscaped';
      const GROK_REGEX = 'grokRegex';

      await grokDebugger.assertPatternInputSyntaxHighlighting([
        { token: GROK_ESCAPE, content: '\\' },
        { token: GROK_ESCAPED, content: '[' },
        { token: GROK_REGEX, content: '(' },
        { token: GROK_REGEX, content: '?' },
        { token: GROK_REGEX, content: ':' },
        { token: GROK_REGEX, content: '|' },
        { token: GROK_START, content: '%{' },
        { token: GROK_PATTERN_NAME, content: 'NUMBER' },
        { token: GROK_SEPARATOR, content: ':' },
        { token: GROK_FIELD_NAME, content: 'bytes' },
        { token: GROK_SEPARATOR, content: ':' },
        { token: GROK_FIELD_TYPE, content: 'int' },
        { token: GROK_END, content: '}' },
        { token: GROK_REGEX, content: ')' },
        { token: GROK_ESCAPE, content: '\\' },
        { token: GROK_ESCAPED, content: ']' },
      ]);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });
  });
};
