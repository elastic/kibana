/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ getService, getPageObjects }) {
  const browser = getService('browser');
  const grokDebugger = getService('grokDebugger');
  const esArchiver = getService('esArchiver');

  const PageObjects = getPageObjects(['grokDebugger']);

  describe('grok debugger app', function() {
    this.tags('smoke');
    before(async () => {
      await esArchiver.load('empty_kibana');
      // Increase window height to ensure "Simulate" button is shown above the
      // fold. Otherwise it can't be clicked by the browser driver.
      await browser.setWindowSize(1600, 1000);

      await PageObjects.grokDebugger.gotoGrokDebugger();
    });

    describe('input with built-in grok patterns', () => {
      it('accepts and parses the input', async () => {
        await grokDebugger.setEventInput('SegerCommaBob');
        await grokDebugger.setPatternInput('%{USERNAME:u}');
        await grokDebugger.clickSimulate();

        await grokDebugger.assertEventOutput({ u: 'SegerCommaBob' });
      });
    });

    describe('input with custom grok patterns', () => {
      it('accepts and parses the input', async () => {
        await grokDebugger.setEventInput('Seger Comma Bob');
        await grokDebugger.setPatternInput('%{FIRSTNAME:f} %{MIDDLENAME:m} %{LASTNAME:l}');

        await grokDebugger.toggleCustomPatternsInput();
        await grokDebugger.setCustomPatternsInput(
          'FIRSTNAME %{WORD}\nMIDDLENAME %{WORD}\nLASTNAME %{WORD}'
        );

        await grokDebugger.clickSimulate();

        await grokDebugger.assertEventOutput({ f: 'Seger', m: 'Comma', l: 'Bob' });
      });
    });

    describe('syntax highlighting', () => {
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
    });
  });
}
