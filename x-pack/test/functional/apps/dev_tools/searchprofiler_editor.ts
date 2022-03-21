/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const retry = getService('retry');
  const security = getService('security');
  const es = getService('es');
  const log = getService('log');

  const editorTestSubjectSelector = 'searchProfilerEditor';

  describe('Search Profiler Editor', () => {
    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
      await PageObjects.common.navigateToApp('searchProfiler');
      expect(await testSubjects.exists('searchProfilerEditor')).to.be(true);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
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
            `parser errors to match expectation: HAS ${expectation ? 'ERRORS' : 'NO ERRORS'}`,
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

    describe('No indices', () => {
      before(async () => {
        // Delete any existing indices that were not properly cleaned up
        try {
          const indices = await es.indices.get({
            index: '*',
          });
          const indexNames = Object.keys(indices);

          if (indexNames.length > 0) {
            await asyncForEach(indexNames, async (indexName) => {
              await es.indices.delete({ index: indexName });
            });
          }
        } catch (e) {
          log.debug('[Setup error] Error deleting existing indices');
          throw e;
        }
      });

      it('returns error if profile is executed with no valid indices', async () => {
        const input = {
          query: {
            match_all: {},
          },
        };

        await aceEditor.setValue(editorTestSubjectSelector, JSON.stringify(input));

        await testSubjects.click('profileButton');

        await retry.waitFor('notification renders', async () => {
          const notification = await testSubjects.find('noShardsNotification');
          const notificationText = await notification.getVisibleText();
          return notificationText.includes('Unable to profile');
        });
      });
    });
  });
}
