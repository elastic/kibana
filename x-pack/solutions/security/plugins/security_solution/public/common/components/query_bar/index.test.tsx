/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { act, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../../common/constants';
import { TestProviders, mockIndexPattern } from '../../mock';
import { FilterManager } from '@kbn/data-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import type { QueryBarComponentProps } from '.';
import { QueryBar } from '.';

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { fields } from '@kbn/data-views-plugin/common/mocks';
import { useKibana } from '../../lib/kibana';

const getMockIndexPattern = () => ({
  ...createStubDataView({
    spec: {
      id: '1234',
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

const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;
jest.mock('../../lib/kibana');

describe('QueryBar ', () => {
  const mockClearInstanceCache = jest.fn().mockImplementation(({ id }: { id: string }) => {
    return id;
  });

  (useKibana as jest.Mock).mockReturnValue({
    services: {
      data: {
        dataViews: {
          create: jest.fn().mockResolvedValue(getMockIndexPattern()),
          clearInstanceCache: mockClearInstanceCache,
        },
      },
    },
  });
  const mockOnChangeQuery = jest.fn();
  const mockOnSubmitQuery = jest.fn();
  const mockOnSavedQuery = jest.fn();

  const Proxy = (props: QueryBarComponentProps) => (
    <TestProviders>
      <QueryBar {...props} />
    </TestProviders>
  );

  // The data plugin's `SearchBar` is lazy loaded, so we need to ensure it is
  // available before we mount our component with Enzyme.
  const getWrapper = async (Component: ReturnType<typeof Proxy>) => {
    const wrapper = mount(Component);
    await waitFor(() => wrapper.find('[data-test-subj="queryInput"]').exists()); // check for presence of query input
    return wrapper;
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
  });

  test('check if we format the appropriate props to QueryBar', async () => {
    await act(async () => {
      const wrapper = await getWrapper(
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

      await waitFor(() => {
        wrapper.update();
        const {
          customSubmitButton,
          timeHistory,
          onClearSavedQuery,
          onFiltersUpdated,
          onQueryChange,
          onQuerySubmit,
          onSaved,
          onSavedQueryUpdated,
          ...searchBarProps
        } = wrapper.find(SearchBar).props();
        expect((searchBarProps?.indexPatterns ?? [{ id: 'unknown' }])[0].id).toEqual(
          getMockIndexPattern().id
        );
      });
      // ensure useEffect cleanup is called correctly after component unmounts
      wrapper.unmount();
      expect(mockClearInstanceCache).toHaveBeenCalledWith(getMockIndexPattern().id);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/132659
  describe.skip('#onQuerySubmit', () => {
    test(' is the only reference that changed when filterQuery props get updated', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
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
        const searchBarProps = wrapper.find(SearchBar).props();
        const onChangedQueryRef = searchBarProps.onQueryChange;
        const onSubmitQueryRef = searchBarProps.onQuerySubmit;
        const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

        wrapper.setProps({ filterQuery: { expression: 'new: one', kind: 'kuery' } });
        wrapper.update();

        expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
        expect(onChangedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQueryChange);
        expect(onSavedQueryRef).toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
      });
    });

    test(' is only reference that changed when timelineId props get updated', async () => {
      const wrapper = await getWrapper(
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
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ onSubmitQuery: jest.fn() });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });
  });

  describe('#onSavedQueryUpdated', () => {
    test('is only reference that changed when dataProviders props get updated', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
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
        const searchBarProps = wrapper.find(SearchBar).props();
        const onChangedQueryRef = searchBarProps.onQueryChange;
        const onSubmitQueryRef = searchBarProps.onQuerySubmit;
        const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;
        wrapper.setProps({ onSavedQuery: jest.fn() });

        expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
        expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
        expect(onSubmitQueryRef).toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      });
    });
  });

  describe('SavedQueryManagementComponent state', () => {
    test('popover should remain open when "Save current query" button was clicked', async () => {
      await act(async () => {
        const wrapper = await getWrapper(
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
        const isSavedQueryPopoverOpen = () =>
          wrapper.find('EuiPopover[data-test-subj="queryBarMenuPopover"]').prop('isOpen');

        expect(isSavedQueryPopoverOpen()).toBeFalsy();

        wrapper.find('button[data-test-subj="showQueryBarMenu"]').simulate('click');

        await waitFor(() => {
          expect(isSavedQueryPopoverOpen()).toBeTruthy();
        });
        wrapper
          .find('button[data-test-subj="saved-query-management-save-button"]')
          .simulate('click');

        await waitFor(() => {
          expect(isSavedQueryPopoverOpen()).toBeTruthy();
        });
      });
    });
  });
});
