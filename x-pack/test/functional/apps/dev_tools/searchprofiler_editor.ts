/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const retry = getService('retry');

  const editorTestSubjectSelector = 'searchProfilerEditor';

  describe('Search Profiler Editor', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('searchProfiler');
      expect(await testSubjects.exists('searchProfilerEditor')).to.be(true);
    });

    it('correctly parses triple quotes in JSON', async () => {
      // The below inputs are written to work _with_ ace's autocomplete unlike console's unit test
      // counterparts in src/legacy/core_plugins/console/public/tests/src/editor.test.js

      const okInput = [
        `{
"query": {
"match_all": {}`,
        `{
"query": {
"match_all": {
"test": """{ "more": "json" }"""`,
      ];

      const notOkInput = [
        `{
"query": {
"match_all": {
"test": """{ "more": "json" }""`,
        `{
"query": {
"match_all": {
"test": """{ "more": "json" }""'`,
      ];

      const expectHasParseErrorsToBe = (expectation: boolean) => async (inputs: string[]) => {
        for (const input of inputs) {
          await aceEditor.setValue(editorTestSubjectSelector, input);

          await retry.waitFor(
            `parser errors to match expection: HAS ${expectation ? 'ERRORS' : 'NO ERRORS'}`,
            async () => {
              const actual = await aceEditor.hasParseErrors(editorTestSubjectSelector);
              return expectation === actual;
            }
          );
        }
      };

      await expectHasParseErrorsToBe(false)(okInput);
      await expectHasParseErrorsToBe(true)(notOkInput);
    });
  });
}
