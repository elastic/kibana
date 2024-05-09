/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const testIndex = 'test-index';
const testQuery = {
  query: {
    match_all: {},
  },
};
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['svlCommonPage', 'common', 'searchProfiler']);
  const retry = getService('retry');
  const es = getService('es');

  describe('Search Profiler Editor', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
      await PageObjects.common.navigateToApp('searchProfiler');
      expect(await PageObjects.searchProfiler.editorExists()).to.be(true);
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
