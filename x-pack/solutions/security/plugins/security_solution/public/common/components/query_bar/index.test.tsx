/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, render, fireEvent, screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../common/constants';
import { TestProviders, mockIndexPattern } from '../../mock';
import { FilterManager } from '@kbn/data-plugin/public';
import type { QueryBarComponentProps } from '.';
import { QueryBar } from '.';

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { fields } from '@kbn/data-views-plugin/common/mocks';
import { useKibana } from '../../lib/kibana';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';

const getMockIndexPattern = (id: string = '1234') => ({
  ...createStubDataView({
    spec: {
      id,
      title: 'logstash-*',
      fields: ((): DataViewFieldMap => {
        const fieldMap: DataViewFieldMap = Object.create(null);
        for (const field of fields) {
          fieldMap[field.name] = { ...field };
        }
        return fieldMap;
      })(),
    },
  }),
});

const mockDataView = getMockIndexPattern('data-view-id');

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;
jest.mock('../../lib/kibana');

describe('QueryBar ', () => {
  const mockClearInstanceCache = jest.fn().mockImplementation(({ id }: { id: string }) => {
    return id;
  });
  const mockDataViewCreate = jest.fn().mockResolvedValue(getMockIndexPattern());

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      data: {
        dataViews: {
          create: mockDataViewCreate,
          clearInstanceCache: mockClearInstanceCache,
        },
      },
    },
  });
  const mockOnChangeQuery = jest.fn();
  const mockOnSubmitQuery = jest.fn();
  const mockOnSavedQuery = jest.fn();
  const mockOnCreateQuery = jest.fn().mockResolvedValue({
    attributes: {
      title: 'hello',
    },
  });

  const Proxy = (props: QueryBarComponentProps) => {
    const startServices = createStartServicesMock();

    return (
      <TestProviders
        startServices={{
          ...startServices,
          data: {
            ...startServices.data,
            query: {
              ...startServices.data.query,
              savedQueries: {
                ...startServices.data.query.savedQueries,
                createQuery: mockOnCreateQuery,
              },
            },
          },
        }}
      >
        <QueryBar {...props} />
      </TestProviders>
    );
  };
  let abortSpy: jest.SpyInstance;
  beforeAll(() => {
    const mockAbort = new AbortController();
    mockAbort.abort();
    abortSpy = jest.spyOn(window, 'AbortController').mockImplementation(() => mockAbort);
  });

  afterAll(() => {
    abortSpy.mockRestore();
  });
  beforeEach(() => {
    mockOnChangeQuery.mockClear();
    mockOnSubmitQuery.mockClear();
    mockOnSavedQuery.mockClear();
    mockClearInstanceCache.mockClear();
    mockDataViewCreate.mockClear();
  });

  test('`clearInstanceCache` should be called on unmount if `indexPattern` is NOT a DataView', async () => {
    const { unmount } = render(
      <Proxy
        dateRangeFrom={DEFAULT_FROM}
        dateRangeTo={DEFAULT_TO}
        hideSavedQuery={false}
        indexPattern={mockIndexPattern}
        isRefreshPaused={true}
        filterQuery={{ query: 'here: query', language: 'kuery' }}
        filterManager={new FilterManager(mockUiSettingsForFilterManager)}
        filters={[]}
        onChangedQuery={mockOnChangeQuery}
        onSubmitQuery={mockOnSubmitQuery}
        onSavedQuery={mockOnSavedQuery}
      />
    );

    // Wait for async effects implementation to finish
    await waitFor(() => {
      expect(mockDataViewCreate).toHaveBeenCalled();
    });

    unmount();

    expect(mockClearInstanceCache).toHaveBeenCalledTimes(1);
    expect(mockClearInstanceCache).toHaveBeenCalledWith(getMockIndexPattern().id);
  });

  test('`clearInstanceCache` should NOT be called on unmount if `indexPattern` is a DataView', async () => {
    const { unmount } = render(
      <Proxy
        dateRangeFrom={DEFAULT_FROM}
        dateRangeTo={DEFAULT_TO}
        hideSavedQuery={false}
        indexPattern={mockDataView}
        isRefreshPaused={true}
        filterQuery={{ query: 'here: query', language: 'kuery' }}
        filterManager={new FilterManager(mockUiSettingsForFilterManager)}
        filters={[]}
        onChangedQuery={mockOnChangeQuery}
        onSubmitQuery={mockOnSubmitQuery}
        onSavedQuery={mockOnSavedQuery}
      />
    );

    unmount();

    expect(mockClearInstanceCache).not.toHaveBeenCalled();
  });

  test('do not clear cache when preventCacheClearOnUnmount is true', async () => {
    const { unmount } = render(
      <Proxy
        dateRangeFrom={DEFAULT_FROM}
        dateRangeTo={DEFAULT_TO}
        hideSavedQuery={false}
        indexPattern={mockIndexPattern}
        isRefreshPaused={true}
        filterQuery={{ query: 'here: query', language: 'kuery' }}
        filterManager={new FilterManager(mockUiSettingsForFilterManager)}
        filters={[]}
        onChangedQuery={mockOnChangeQuery}
        onSubmitQuery={mockOnSubmitQuery}
        onSavedQuery={mockOnSavedQuery}
        preventCacheClearOnUnmount={true}
      />
    );

    // Wait for async effects implementation to finish
    await waitFor(() => {
      expect(mockDataViewCreate).toHaveBeenCalled();
    });

    unmount();

    expect(mockClearInstanceCache).not.toHaveBeenCalled();
  });

  describe('SavedQueryManagementComponent state', () => {
    test('onSavedQuery gets called when the user clicks on the "save query" button', async () => {
      const QUERY_BAR_MENU_PANEL_TEST_ID = 'queryBarMenuPanel';
      const { findByTestId } = render(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{
            query: 'here: query',
            language: 'kuery',
          }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );

      expect(screen.queryByTestId(QUERY_BAR_MENU_PANEL_TEST_ID)).toBeNull();

      const btn = await findByTestId('showQueryBarMenu');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.queryByTestId(QUERY_BAR_MENU_PANEL_TEST_ID)).toBeVisible();
      });

      fireEvent.click(await findByTestId('saved-query-management-save-button'));

      await waitFor(() => {
        expect(screen.queryByTestId(QUERY_BAR_MENU_PANEL_TEST_ID)).toBeVisible();
      });

      fireEvent.change(await findByTestId('saveQueryFormTitle'), {
        target: {
          value: 'My query',
        },
      });
      fireEvent.click(await findByTestId('savedQueryFormSaveButton'));

      await waitFor(() => {
        expect(mockOnSavedQuery).toHaveBeenCalledWith({
          attributes: { title: 'hello' },
        });
      });
    });
  });
});
