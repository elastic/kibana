/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export function GrokDebuggerProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');

  // test subject selectors
  const SUBJ_CONTAINER = 'grokDebuggerContainer';

  const SUBJ_UI_ACE_PATTERN_INPUT = `${SUBJ_CONTAINER} > acePatternInput > codeEditorContainer`;
  const SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT = `${SUBJ_CONTAINER} > btnToggleCustomPatternsInput`;
  const SUBJ_BTN_SIMULATE = `${SUBJ_CONTAINER} > btnSimulate`;

  return new (class GrokDebugger {
    async clickSimulate() {
      await testSubjects.click(SUBJ_BTN_SIMULATE);
    }

    async setEventInput(value) {
      await monacoEditor.setCodeEditorValue(value, 0);
    }

    async setPatternInput(value) {
      await monacoEditor.setCodeEditorValue(value, 1);
    }

    async toggleCustomPatternsInput() {
      await testSubjects.click(SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT);
    }

    async setCustomPatternsInput(value) {
      await monacoEditor.setCodeEditorValue(value, 2);
    }

    async getEventOutput() {
      return await testSubjects.getVisibleText('eventOutputCodeBlock');
    }

    async assertExists() {
      await retry.waitFor('Grok Debugger to exist', async () => {
        return await testSubjects.exists(SUBJ_CONTAINER);
      });
    }

    async assertEventOutput(expectedValue) {
      await retry.try(async () => {
        const value = JSON.parse(await this.getEventOutput());
        expect(value).to.eql(expectedValue);
      });
    }

    async assertPatternInputSyntaxHighlighting(expectedHighlights) {
      const patternInputElement = await testSubjects.find(SUBJ_UI_ACE_PATTERN_INPUT);
      const highlightedElements = await patternInputElement.findAllByXpath(
        './/div[@class="ace_line"]/*'
      );

      expect(highlightedElements.length).to.be(expectedHighlights.length);
      await Promise.all(
        highlightedElements.map(async (element, index) => {
          const highlightClass = await element.getAttribute('class');
          const highlightedContent = await element.getVisibleText();

          const expectedHighlight = expectedHighlights[index];
          const expectedHighlightClass = `ace_${expectedHighlight.token}`;
          const expectedHighlightedContent = expectedHighlight.content;

          expect(highlightClass).to.be(expectedHighlightClass);
          expect(highlightedContent).to.be(expectedHighlightedContent);
        })
      );
    }
  })();
}
