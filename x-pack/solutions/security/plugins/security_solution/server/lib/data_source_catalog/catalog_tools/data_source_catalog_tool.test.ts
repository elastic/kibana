/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggerMock } from '@kbn/logging-mocks';
import type { RetrievalQAChain } from '@langchain/classic/chains';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
import { DATA_SOURCE_CATALOG_TOOL } from './data_source_catalog_tool';

describe('DataSourceCatalogTool', () => {
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;

  const logger = loggerMock.create();
  const chain = {} as unknown as RetrievalQAChain;
  const contentReferencesStore = newContentReferencesStoreMock();

  const baseParams = {
    isEnabledKnowledgeBase: false,
    chain,
    logger,
    contentReferencesStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the correct id and name', () => {
    expect(DATA_SOURCE_CATALOG_TOOL.id).toBe('data-source-catalog-tool');
    expect(DATA_SOURCE_CATALOG_TOOL.name).toBe('DataSourceCatalogTool');
  });

  describe('isSupported', () => {
    it('returns true when esClient is available', () => {
      const params = { ...baseParams, esClient };
      expect(DATA_SOURCE_CATALOG_TOOL.isSupported(params)).toBe(true);
    });

    it('returns false when esClient is missing', () => {
      const params = { ...baseParams, esClient: undefined };
      expect(DATA_SOURCE_CATALOG_TOOL.isSupported(params)).toBe(false);
    });
  });
});
