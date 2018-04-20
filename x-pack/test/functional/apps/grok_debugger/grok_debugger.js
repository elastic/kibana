/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, getPageObjects }) {
  const remote = getService('remote');
  const grokDebugger = getService('grokDebugger');

  const PageObjects = getPageObjects(['grokDebugger']);

  describe('grok debugger app', () => {
    before(async () => {
      // Increase window height to ensure "Simulate" button is shown above the
      // fold. Otherwise it can't be clicked by the browser driver.
      remote.setWindowSize(1600, 1000);

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
        await grokDebugger.setCustomPatternsInput('FIRSTNAME %{WORD}\nMIDDLENAME %{WORD}\nLASTNAME %{WORD}');

        await grokDebugger.clickSimulate();

        await grokDebugger.assertEventOutput({ f: 'Seger', m: 'Comma', l: 'Bob' });
      });
    });
  });
}
