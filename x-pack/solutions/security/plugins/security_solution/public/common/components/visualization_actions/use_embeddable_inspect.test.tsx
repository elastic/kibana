/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DefaultInspectorAdapters, TablesAdapter } from '@kbn/expressions-plugin/common';

import type { Request } from './types';
import { RequestStatus } from './types';
import { useEmbeddableInspect } from './use_embeddable_inspect';

const mockOnLoad = jest.fn();
const mockRequests = [
  {
    id: '1',
    name: 'name',
    startTime: 123124012,
    status: RequestStatus.OK,
    json: { reqFoo: 'reqBar' },
    response: {
      json: {
        rawResponse: {
          resFoo: 'resBar',
        },
      },
    },
  },
] satisfies Request[];

const mockTablesAdapter = {
  tables: {
    table1: {
      type: 'datatable',
      columns: [
        {
          id: 'column1',
          name: 'Column 1',
          meta: {
            type: 'string',
            params: {
              id: 'string',
            },
          },
        },
      ],
      rows: [
        {
          column1: 'value1',
        },
      ],
      meta: {
        statistics: {
          totalCount: 999,
        },
      },
    },
  },
} satisfies Partial<TablesAdapter>;
const mockAdapters = {
  requests: { getRequests: () => mockRequests },
  tables: mockTablesAdapter,
} as unknown as Partial<DefaultInspectorAdapters>;

describe('useEmbeddableInspect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when onEmbeddableLoad is provided', () => {
    describe('when loaded and has adapters', () => {
      it('should call onEmbeddableLoad with adapter data', () => {
        const { result } = renderHook(() => useEmbeddableInspect(mockOnLoad));
        result.current.setInspectData(false, mockAdapters);

        expect(mockOnLoad).toHaveBeenCalledWith({
          requests: [JSON.stringify({ body: mockRequests[0].json, index: [''] }, null, 2)],
          responses: [JSON.stringify(mockRequests[0].response.json.rawResponse, null, 2)],
          isLoading: false,
          tables: {
            tables: mockTablesAdapter.tables,
            meta: {
              statistics: {
                totalCount: mockTablesAdapter.tables.table1.meta.statistics.totalCount,
              },
            },
          },
        });
      });
    });

    describe('when loading', () => {
      it('should call onEmbeddableLoad with empty requests/responses and loading: true', () => {
        const { result } = renderHook(() => useEmbeddableInspect(mockOnLoad));
        result.current.setInspectData(true, mockAdapters);
        expect(mockOnLoad).toHaveBeenCalledWith({
          requests: [],
          responses: [],
          isLoading: true,
        });
      });
    });

    describe('when no adapters', () => {
      it('should call onEmbeddableLoad with empty requests/responses and loading: true', () => {
        const { result } = renderHook(() => useEmbeddableInspect(mockOnLoad));
        result.current.setInspectData(false, undefined);
        expect(mockOnLoad).toHaveBeenCalledWith({
          requests: [],
          responses: [],
          isLoading: true,
        });
      });
    });

    describe('when adapters.tables.tables is {}', () => {
      it('should not include tables in the onEmbeddableLoad call', () => {
        const { result } = renderHook(() => useEmbeddableInspect(mockOnLoad));
        const emptyTablesAdapter = {
          tables: {},
        } satisfies Partial<TablesAdapter>;
        result.current.setInspectData(false, {
          requests: { getRequests: () => mockRequests },
          tables: emptyTablesAdapter,
        } as unknown as Partial<DefaultInspectorAdapters>);
        expect(mockOnLoad).toHaveBeenCalledWith({
          requests: [JSON.stringify({ body: mockRequests[0].json, index: [''] }, null, 2)],
          responses: [JSON.stringify(mockRequests[0].response.json.rawResponse, null, 2)],
          isLoading: false,
        });
      });
    });
  });

  describe('when no onEmbeddableLoad is provided', () => {
    it('should not throw when setInspectData is called', () => {
      const { result } = renderHook(() => useEmbeddableInspect());
      expect(() => {
        result.current.setInspectData(false, mockAdapters);
      }).not.toThrow();
    });
  });
});
