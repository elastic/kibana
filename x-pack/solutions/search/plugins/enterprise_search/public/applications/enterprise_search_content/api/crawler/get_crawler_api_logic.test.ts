/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { CRAWLER_DATA_FROM_SERVER } from './_mocks_/crawler.mock';
import { getCrawler } from './get_crawler_api_logic';
import { crawlerDataServerToClient } from './utils';

describe('GetCrawlerApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getCrawler', () => {
    it('calls correct api', async () => {
      const indexName = 'elastic-co-crawler';
      http.get.mockReturnValue(Promise.resolve(CRAWLER_DATA_FROM_SERVER));

      const result = getCrawler({ indexName });
      await nextTick();

      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/indices/${indexName}/crawler`
      );
      await expect(result).resolves.toEqual(crawlerDataServerToClient(CRAWLER_DATA_FROM_SERVER));
    });
  });
});
