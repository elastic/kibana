/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createMockStore, mockGlobalState, TestProviders } from '../../mock';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { SearchBarComponent } from '.';
import type { SavedQuery } from '@kbn/data-plugin/public';
import { FilterManager } from '@kbn/data-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { inputsActions } from '../../store/inputs';
import { InputsModelId } from '../../store/inputs/constants';
import { useKibana } from '../../lib/kibana';
import { useKibana as mockUseKibana } from '../../lib/kibana/__mocks__';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

const mockSetAppFilters = jest.fn();
const mockFilterManager = new FilterManager(coreMock.createStart().uiSettings);
mockFilterManager.setAppFilters = mockSetAppFilters;
jest.mock('../../lib/kibana');

const mockUpdateUrlParam = jest.fn();
jest.mock('../../utils/global_query_string', () => ({
  useUpdateUrlParam: () => mockUpdateUrlParam,
}));

const dataView: DataView = createStubDataView({ spec: {} });
const dataViewSpec: DataViewSpec = dataView.toSpec();

const original = mockUseKibana();
const useKibanaMock = {
  services: {
    ...original.services,
    data: {
      ...original.services.data,
      query: {
        ...original.services.data.query,
        filterManager: mockFilterManager,
      },
    },
    unifiedSearch: {
      ui: {
        SearchBar: jest.fn().mockImplementation((props) => (
          <button
            data-test-subj="querySubmitButton"
            onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
            type="button"
          >
            {'Hello world'}
          </button>
        )),
      },
    },
  },
};
describe('SearchBarComponent', () => {
  const props = {
    id: InputsModelId.global as const,
    indexPattern: {
      fields: [],
      title: '',
    },
    dataView,
    sourcererDataViewSpec: dataViewSpec,
    updateSearch: jest.fn(),
    setSavedQuery: jest.fn(),
    setSearchBarFilter: jest.fn(),
    end: '',
    start: '',
    toStr: '',
    fromStr: '',
    isLoading: false,
    filterQuery: {
      query: '',
      language: '',
    },
    queries: [],
    savedQuery: undefined,
  };

  const pollForSignalIndex = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue(useKibanaMock);
  });

  it('calls pollForSignalIndex on Refresh button click', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarComponent {...props} pollForSignalIndex={pollForSignalIndex} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('querySubmitButton'));
    expect(pollForSignalIndex).toHaveBeenCalled();
  });

  it('does not call pollForSignalIndex on Refresh button click if pollForSignalIndex not passed', () => {
    const { getByTestId } = render(
      <TestProviders>
        <SearchBarComponent {...props} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('querySubmitButton'));
    expect(pollForSignalIndex).not.toHaveBeenCalled();
  });

  it('calls useUpdateUrlParam for filter and query', () => {
    const query = { query: 'testQuery', language: 'kuery' };
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'phrase',
          key: 'host.name',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
      },
    ];

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          filters,
          query,
        },
      },
    };

    const store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    expect(mockUpdateUrlParam).toHaveBeenCalledWith(filters);
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(query);
    // For updateSavedQueryUrlParam
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(null);
  });

  it('calls useUpdateUrlParam for savedQuery', () => {
    const savedQuery: SavedQuery = {
      id: 'testSavedquery',
      namespaces: ['default'],
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'kuery' },
      },
    };

    const state = {
      ...mockGlobalState,
      inputs: {
        ...mockGlobalState.inputs,
        global: {
          ...mockGlobalState.inputs.global,
          savedQuery,
        },
      },
    };

    const store = createMockStore(state);

    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    // For filters and query
    expect(mockUpdateUrlParam).toHaveBeenNthCalledWith(2, null);
    expect(mockUpdateUrlParam).toHaveBeenCalledWith(savedQuery.id);
  });

  it('calls useUpdateUrlParam when query query changes', async () => {
    const store = createMockStore();
    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    const newQuery = { query: 'testQuery', language: 'new testLanguage' };

    act(() => {
      store.dispatch(
        inputsActions.setFilterQuery({
          id: InputsModelId.global,
          ...newQuery,
        })
      );
    });

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(newQuery);
    });
  });

  it('calls useUpdateUrlParam when filters change', async () => {
    const store = createMockStore();
    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'phrase',
          key: 'host.name',
        },
        query: { match_phrase: { 'host.name': 'testValue' } },
      },
    ];
    act(() => {
      store.dispatch(
        inputsActions.setSearchBarFilter({
          id: InputsModelId.global,
          filters,
        })
      );
    });

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(filters);
    });
  });

  it('calls useUpdateUrlParam when savedQuery changes', async () => {
    const store = createMockStore();
    render(
      <TestProviders store={store}>
        <SearchBarComponent {...props} />
      </TestProviders>
    );

    const savedQuery: SavedQuery = {
      id: 'testSavedQuery123',
      namespaces: ['default'],
      attributes: {
        title: 'testtitle',
        description: 'testDescription',
        query: { query: 'testQuery', language: 'kuery' },
      },
    };
    act(() => {
      store.dispatch(
        inputsActions.setSavedQuery({
          id: InputsModelId.global,
          savedQuery,
        })
      );
    });

    await waitFor(() => {
      expect(mockUpdateUrlParam).toHaveBeenCalledWith(savedQuery.id);
    });
  });

  describe('Timerange', () => {
    it('calls useUpdateUrlParam when global timerange changes', async () => {
      const store = createMockStore();
      render(
        <TestProviders store={store}>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      const newTimerange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2020-07-08T08:20:18.966Z',
        toStr: 'now',
      };

      act(() => {
        store.dispatch(
          inputsActions.setRelativeRangeDatePicker({ id: InputsModelId.global, ...newTimerange })
        );
      });

      await waitFor(() => {
        expect(mockUpdateUrlParam).toHaveBeenCalledWith(
          expect.objectContaining({
            global: {
              linkTo: [InputsModelId.timeline],
              timerange: newTimerange,
            },
          })
        );
      });
    });

    it('calls useUpdateUrlParam when timeline timerange changes', async () => {
      const store = createMockStore();
      render(
        <TestProviders store={store}>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      const newTimerange = {
        from: '2020-07-07T08:20:18.966Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2020-07-08T08:20:18.966Z',
        toStr: 'now',
      };
      act(() => {
        store.dispatch(
          inputsActions.setRelativeRangeDatePicker({
            id: InputsModelId.timeline,
            ...newTimerange,
          })
        );
      });

      await waitFor(() => {
        expect(mockUpdateUrlParam).toHaveBeenCalledWith(
          expect.objectContaining({
            timeline: {
              linkTo: [InputsModelId.global],
              timerange: newTimerange,
            },
          })
        );
      });
    });

    it('initializes timerange URL param with redux date on mount', async () => {
      render(
        <TestProviders>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      expect(mockUpdateUrlParam.mock.calls[3]).toEqual([
        {
          global: {
            timerange: mockGlobalState.inputs.global.timerange,
            linkTo: mockGlobalState.inputs.global.linkTo,
          },
          timeline: {
            timerange: mockGlobalState.inputs.timeline.timerange,
            linkTo: mockGlobalState.inputs.timeline.linkTo,
          },
          valueReport: {
            timerange: mockGlobalState.inputs.valueReport.timerange,
            linkTo: mockGlobalState.inputs.valueReport.linkTo,
          },
        },
      ]);
    });

    it('initializes timerange URL param with redux date on mount -- serverless', async () => {
      (useKibana as jest.Mock).mockReturnValue({
        ...useKibanaMock,
        services: { ...useKibanaMock.services, serverless: {} },
      });
      render(
        <TestProviders>
          <SearchBarComponent {...props} />
        </TestProviders>
      );

      expect(mockUpdateUrlParam.mock.calls[3]).toEqual([
        {
          global: {
            timerange: mockGlobalState.inputs.global.timerange,
            linkTo: mockGlobalState.inputs.global.linkTo,
          },
          timeline: {
            timerange: mockGlobalState.inputs.timeline.timerange,
            linkTo: mockGlobalState.inputs.timeline.linkTo,
          },
          valueReport: {
            timerange: mockGlobalState.inputs.valueReport.timerange,
            linkTo: mockGlobalState.inputs.valueReport.linkTo,
          },
        },
      ]);
    });
  });
});
