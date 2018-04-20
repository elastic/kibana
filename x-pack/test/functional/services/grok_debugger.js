/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export function GrokDebuggerProvider({ getService }) {
  const aceEditor = getService('aceEditor');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  // test subject selectors
  const SUBJ_CONTAINER = 'grokDebugger';

  const SUBJ_UI_ACE_EVENT_INPUT = `${SUBJ_CONTAINER} aceEventInput`;
  const SUBJ_UI_ACE_PATTERN_INPUT = `${SUBJ_CONTAINER} acePatternInput`;
  const SUBJ_UI_ACE_CUSTOM_PATTERNS_INPUT = `${SUBJ_CONTAINER} aceCustomPatternsInput`;
  const SUBJ_UI_ACE_EVENT_OUTPUT = `${SUBJ_CONTAINER} aceEventOutput`;

  const SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT = `${SUBJ_CONTAINER} btnToggleCustomPatternsInput`;
  const SUBJ_BTN_SIMULATE = `${SUBJ_CONTAINER} btnSimulate`;

  return new class GrokDebugger {
    async clickSimulate() {
      await testSubjects.click(SUBJ_BTN_SIMULATE);
    }

    async setEventInput(value) {
      await aceEditor.setValue(SUBJ_UI_ACE_EVENT_INPUT, value);
    }

    async setPatternInput(value) {
      await aceEditor.setValue(SUBJ_UI_ACE_PATTERN_INPUT, value);
    }

    async toggleCustomPatternsInput() {
      await testSubjects.click(SUBJ_BTN_TOGGLE_CUSTOM_PATTERNS_INPUT);
    }

    async setCustomPatternsInput(value) {
      await aceEditor.setValue(SUBJ_UI_ACE_CUSTOM_PATTERNS_INPUT, value);
    }

    async getEventOutput() {
      return await aceEditor.getValue(SUBJ_UI_ACE_EVENT_OUTPUT);
    }

    async assertExists() {
      await retry.try(async () => {
        if (!await testSubjects.exists(SUBJ_CONTAINER)) {
          throw new Error('Expected to find the grok debugger');
        }
      });
    }

    async assertEventOutput(expectedValue) {
      await retry.try(async () => {
        const value = JSON.parse(await this.getEventOutput());
        expect(value).to.eql(expectedValue);
      });
    }
  };
}
