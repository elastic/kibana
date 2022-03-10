/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { compressToEncodedURIComponent } from 'lz-string';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const aceEditor = getService('aceEditor');
  const retry = getService('retry');
  const security = getService('security');

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

    it('supports pre-configured search query', async () => {
      const searchQuery = {
        query: {
          bool: {
            should: [
              {
                match: {
                  name: 'fred',
                },
              },
              {
                terms: {
                  name: ['sue', 'sally'],
                },
              },
            ],
          },
        },
        aggs: {
          stats: {
            stats: {
              field: 'price',
            },
          },
        },
      };

      // Since we're not actually running the query in the test,
      // this index name is just an input placeholder and does not exist
      const indexName = 'my_index';

      const searchQueryURI = compressToEncodedURIComponent(JSON.stringify(searchQuery, null, 2));

      await PageObjects.common.navigateToUrl(
        'searchProfiler',
        `/searchprofiler?index=${indexName}&load_from=${searchQueryURI}`,
        {
          useActualUrl: true,
        }
      );

      const indexInput = await testSubjects.find('indexName');
      const indexInputValue = await indexInput.getAttribute('value');

      expect(indexInputValue).to.eql(indexName);

      await retry.try(async () => {
        const searchProfilerInput = JSON.parse(await aceEditor.getValue('searchProfilerEditor'));
        expect(searchProfilerInput).to.eql(searchQuery);
      });
    });
  });
}
