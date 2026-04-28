/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import type { Store } from 'redux';
import { act, renderHook } from '@testing-library/react';
import { Observable } from 'rxjs';

import { TestProviders, createMockStore } from '../../../../../common/mock';
import { useKibana } from '../../../../../common/lib/kibana';
import { inputsActions } from '../../../../../common/store/inputs';
import { InputsModelId } from '../../../../../common/store/inputs/constants';
import type { EntitiesBaseURLQuery } from './use_entity_url_state';
import { useEntityURLState } from './use_entity_url_state';

jest.mock('../../../../../common/lib/kibana');

const mockSetUrlQuery = jest.fn();
const mockUrlQuery = {
  query: { query: '', language: 'kuery' },
  filters: [],
  pageFilters: [],
  sort: [['@timestamp', 'desc']],
  pageIndex: 0,
};

jest.mock('./use_url_query', () => ({
  useUrlQuery: () => ({ urlQuery: mockUrlQuery, setUrlQuery: mockSetUrlQuery }),
}));

jest.mock('./use_page_size', () => ({
  usePageSize: () => ({ pageSize: 25, setPageSize: jest.fn() }),
}));

jest.mock('./use_base_es_query', () => ({
  useBaseEsQuery: () => ({
    query: { bool: { must: [], filter: [], should: [], must_not: [] } },
  }),
}));

jest.mock('./use_persisted_query', () => ({
  usePersistedQuery:
    <T,>(getter: (params: EntitiesBaseURLQuery) => T) =>
    () =>
      getter({ filters: [], query: { query: '', language: 'kuery' } }),
}));

const mockUseKibana = jest.mocked(useKibana);

const renderUseEntityURLState = (store: Store = createMockStore()) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <TestProviders store={store}>{children}</TestProviders>
  );

  const { result } = renderHook(
    () =>
      useEntityURLState({
        paginationLocalStorageKey: 'test:pagination',
        columnsLocalStorageKey: 'test:columns',
      }),
    { wrapper }
  );

  return { result, store };
};

describe('useEntityURLState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlQuery.query = { query: '', language: 'kuery' };
    mockUrlQuery.filters = [];

    mockUseKibana.mockReturnValue({
      services: {
        data: {
          query: {
            filterManager: {
              setAppFilters: jest.fn(),
              getAppFilters: jest.fn(() => []),
              getUpdates$: jest.fn(() => new Observable()),
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  describe('URL query → Redux sync', () => {
    it('dispatches setFilterQuery when urlQuery.query has a non-empty KQL query', () => {
      mockUrlQuery.query = { query: 'resource.id: "test-resource"', language: 'kuery' };

      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      renderUseEntityURLState(store);

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          query: 'resource.id: "test-resource"',
          language: 'kuery',
        })
      );
    });

    it('dispatches setFilterQuery with empty query when urlQuery.query is empty', () => {
      mockUrlQuery.query = { query: '', language: 'kuery' };

      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      renderUseEntityURLState(store);

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          query: '',
          language: 'kuery',
        })
      );
    });
  });

  describe('Redux query → URL sync', () => {
    it('calls setUrlQuery when Redux query diverges from URL query', () => {
      mockUrlQuery.query = { query: '', language: 'kuery' };

      const store = createMockStore();
      renderUseEntityURLState(store);
      mockSetUrlQuery.mockClear();

      act(() => {
        store.dispatch(
          inputsActions.setFilterQuery({
            id: InputsModelId.global,
            query: 'host.name: "server-1"',
            language: 'kuery',
          })
        );
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        query: { query: 'host.name: "server-1"', language: 'kuery' },
      });
    });

    it('does not call setUrlQuery when Redux query matches URL query (forward-sync guard)', () => {
      mockUrlQuery.query = { query: 'host.name: "server-1"', language: 'kuery' };

      const store = createMockStore();
      renderUseEntityURLState(store);
      mockSetUrlQuery.mockClear();

      expect(mockSetUrlQuery).not.toHaveBeenCalled();
    });
  });

  describe('onResetFilters', () => {
    it('resets the URL state query and filters', () => {
      const { result } = renderUseEntityURLState();

      act(() => {
        result.current.onResetFilters();
      });

      expect(mockSetUrlQuery).toHaveBeenCalledWith({
        pageIndex: 0,
        filters: [],
        query: {
          query: '',
          language: 'kuery',
        },
      });
    });

    it('dispatches setFilterQuery for the global input to clear the search bar text', () => {
      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const { result } = renderUseEntityURLState(store);

      act(() => {
        result.current.onResetFilters();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          query: '',
          language: 'kuery',
        })
      );
    });

    it('dispatches setSavedQuery for the global input to clear any applied saved query', () => {
      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');
      const { result } = renderUseEntityURLState(store);

      act(() => {
        result.current.onResetFilters();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        inputsActions.setSavedQuery({
          id: InputsModelId.global,
          savedQuery: undefined,
        })
      );
    });
  });
});
