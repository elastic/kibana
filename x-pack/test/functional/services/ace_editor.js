/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';

export function AceEditorProvider({ getService }) {
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const retry = getService('retry');

  // see https://w3c.github.io/webdriver/webdriver-spec.html#keyboard-actions
  const CTRL_KEY = '\uE009';
  const CMD_KEY = '\uE03D';
  const BKSP_KEY = '\uE003';

  return new class AceEditorService {
    async setValue(testSubjectSelector, value) {
      await retry.try(async () => {
        const container = await testSubjects.find(testSubjectSelector);
        await container.click();
        const input = await remote.getActiveElement();

        const modifier = process.platform === 'darwin' ? CMD_KEY : CTRL_KEY;
        await input.type([modifier, 'a']); // select all
        await input.type([BKSP_KEY]); // delete current content
        await input.type(value);
      });
    }

    async getValue(testSubjectSelector) {
      return await retry.try(async () => {
        const editor = await testSubjects.find(testSubjectSelector);
        const lines = await editor.findAllByClassName('ace_line');
        const linesText = await mapAsync(lines, line => line.getVisibleText());
        return linesText.join('\n');
      });
    }
  };
}
