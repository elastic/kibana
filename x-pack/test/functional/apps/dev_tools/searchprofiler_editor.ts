/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import { FtrProviderContext } from '../../ftr_provider_context';

const testIndex = 'test-index';
const testQuery = {
  query: {
    match_all: {},
  },
};
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'searchProfiler']);
  const retry = getService('retry');
  const security = getService('security');
  const es = getService('es');
  const log = getService('log');

  // Failing: See https://github.com/elastic/kibana/issues/186126
  describe.skip('Search Profiler Editor', () => {
    before(async () => {
      await security.testUser.setRoles(['global_devtools_read']);
      await PageObjects.common.navigateToApp('searchProfiler');
      expect(await PageObjects.searchProfiler.editorExists()).to.be(true);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('correctly parses triple quotes in JSON', async () => {
      // The below inputs are written to work _with_ ace's autocomplete unlike console's unit test
      // counterparts in src/legacy/core_plugins/console/public/tests/src/editor.test.js

      const okInputs = [
        `{
    "query": {
    "match_all": {}`,
        `{
    "query": {
    "match_all": {
    "test": """{ "more": "json" }"""`,
      ];

      const notOkInputs = [
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
          await PageObjects.searchProfiler.setQuery(input);

          await retry.waitFor(
            `parser errors to match expectation: HAS ${expectation ? 'ERRORS' : 'NO ERRORS'}`,
            async () => {
              const actual = await PageObjects.searchProfiler.editorHasParseErrors();
              return expectation === actual;
            }
          );
        }
      };

      await expectHasParseErrorsToBe(false)(okInputs);
      await expectHasParseErrorsToBe(true)(notOkInputs);
    });

    it('supports pre-configured search query', async () => {
      const query = {
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

      await PageObjects.common.navigateToUrl(
        'searchProfiler',
        PageObjects.searchProfiler.getUrlWithIndexAndQuery({ indexName, query }),
        {
          useActualUrl: true,
        }
      );

      const indexInputValue = await PageObjects.searchProfiler.getIndexName();

      expect(indexInputValue).to.eql(indexName);

      await retry.try(async () => {
        const searchProfilerInput = await PageObjects.searchProfiler.getQuery();
        expect(searchProfilerInput).to.eql(query);
      });
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
        await PageObjects.searchProfiler.setIndexName('_all');
        await PageObjects.searchProfiler.setQuery(testQuery);

        await PageObjects.searchProfiler.clickProfileButton();

        await retry.waitFor('notification renders', async () => {
          return await PageObjects.searchProfiler.editorHasErrorNotification();
        });
      });
    });

    describe('With a test index', () => {
      before(async () => {
        await es.indices.create({ index: testIndex });
      });

      after(async () => {
        await es.indices.delete({ index: testIndex });
      });

      it('profiles a simple query', async () => {
        await PageObjects.searchProfiler.setIndexName(testIndex);
        await PageObjects.searchProfiler.setQuery(testQuery);

        await PageObjects.searchProfiler.clickProfileButton();

        const content = await PageObjects.searchProfiler.getProfileContent();
        expect(content).to.contain(testIndex);
      });
    });
  });
}
