/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function GrokDebuggerPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const retry = getService('retry');
  const log = getService('log');
  return {
    async simulateButton() {
      return await testSubjects.find('btnSimulate');
    },

    async getEventOutput() {
      return await aceEditor.getValue(
        'grokDebuggerContainer > aceEventOutput > codeEditorContainer'
      );
    },

    async setEventInput(value) {
      await aceEditor.setValue(
        'grokDebuggerContainer > aceEventInput > codeEditorContainer',
        value
      );
    },

    async setPatternInput(pattern) {
      await aceEditor.setValue(
        'grokDebuggerContainer > acePatternInput > codeEditorContainer',
        pattern
      );
    },

    async setCustomPatternInput(customPattern) {
      await aceEditor.setValue(
        'grokDebuggerContainer > aceCustomPatternsInput > codeEditorContainer',
        customPattern
      );
    },

    async toggleSetCustomPattern() {
      await testSubjects.click('grokDebuggerContainer > btnToggleCustomPatternsInput');
    },

    async executeGrokSimulation(input, pattern, customPattern) {
      await this.setEventInput(input);
      await this.setPatternInput(pattern);
      if (customPattern) {
        await this.toggleSetCustomPattern();
        await this.setCustomPatternInput(customPattern);
      }
      await (await this.simulateButton()).click();
      await retry.waitFor('Output to not be empty', async () => {
        const value = JSON.parse(await this.getEventOutput());
        log.debug(value);
        return value !== '{}';
      });
      log.debug(await this.getEventOutput());
      return await this.getEventOutput();
    },

    // This needs to be fixed to work with the new test functionality. This method is skipped currently.
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
    },
  };
}
