/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCpsAllClient } from './create_cps_all_client';

const PROJECT_ROUTING_ALL = '_alias:*';

function buildMockEsClient() {
  const mockQuery = jest.fn().mockResolvedValue({ columns: [], values: [] });
  const mockSearch = jest.fn().mockResolvedValue({ hits: { hits: [] } });
  const mockIndicesExists = jest.fn().mockResolvedValue(true);

  return {
    search: mockSearch,
    esql: { query: mockQuery },
    indices: { exists: mockIndicesExists },
    _mocks: { mockSearch, mockQuery, mockIndicesExists },
  };
}

describe('createCpsAllClient', () => {
  describe('search', () => {
    it('injects project_routing into search params', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);

      await cpsClient.search({ index: 'my-index' } as any);

      expect(base._mocks.mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ project_routing: PROJECT_ROUTING_ALL, index: 'my-index' }),
        undefined
      );
    });

    it('does not overwrite an explicitly set project_routing', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);

      await cpsClient.search({ index: 'my-index', project_routing: '_alias:_origin' } as any);

      expect(base._mocks.mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ project_routing: '_alias:_origin' }),
        undefined
      );
    });

    it('passes transport options through', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);
      const signal = new AbortController().signal;

      await cpsClient.search({ index: 'my-index' } as any, { signal } as any);

      expect(base._mocks.mockSearch).toHaveBeenCalledWith(expect.anything(), { signal });
    });
  });

  describe('esql.query', () => {
    it('injects project_routing into esql.query params', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);

      await cpsClient.esql.query({ query: 'FROM logs | STATS count()' } as any);

      expect(base._mocks.mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          project_routing: PROJECT_ROUTING_ALL,
          query: 'FROM logs | STATS count()',
        }),
        undefined
      );
    });

    it('does not overwrite an explicitly set project_routing', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);

      await cpsClient.esql.query({
        query: 'FROM logs | STATS count()',
        project_routing: '_alias:_origin',
      } as any);

      expect(base._mocks.mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({ project_routing: '_alias:_origin' }),
        undefined
      );
    });
  });

  describe('other methods', () => {
    it('passes non-intercepted methods through to the original client', async () => {
      const base = buildMockEsClient();
      const cpsClient = createCpsAllClient(base as any);

      await (cpsClient as any).indices.exists({ index: 'my-index' });

      expect(base._mocks.mockIndicesExists).toHaveBeenCalledWith({ index: 'my-index' });
    });
  });
});
