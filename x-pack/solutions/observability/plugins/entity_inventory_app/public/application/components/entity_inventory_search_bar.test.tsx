/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import type { EntityInventoryEntityCategory } from '../../types';
import { ENTITY_INVENTORY_APP_NAME } from '../constants';
import { EntityInventorySearchProvider } from '../context/entity_inventory_search_context';
import { MAX_TIME_RANGE_HINT, SEARCH_BAR_PLACEHOLDERS } from '../translations';
import { EntityInventorySearchBar } from './entity_inventory_search_bar';

// Mirrors the real SearchBar: the picker keeps its own state, resynced only when the range props change.
const MockSearchBar = jest.fn(({ dateRangeFrom, onQuerySubmit }: StatefulSearchBarProps) => {
  const [pickerFrom, setPickerFrom] = useState(dateRangeFrom);
  useEffect(() => setPickerFrom(dateRangeFrom), [dateRangeFrom]);

  return (
    <button
      data-test-subj="mockSearchBarPick7d"
      data-picker-from={pickerFrom}
      onClick={() => {
        setPickerFrom('now-7d');
        onQuerySubmit?.({ dateRange: { from: 'now-7d', to: 'now' } });
      }}
    />
  );
});

const lastSearchBarProps = (): StatefulSearchBarProps => {
  const { calls } = MockSearchBar.mock;
  return calls[calls.length - 1][0];
};

const renderSearchBar = (entityCategory: EntityInventoryEntityCategory = 'all') => {
  const unifiedSearch = unifiedSearchPluginMock.createStartContract();
  unifiedSearch.ui.SearchBar = MockSearchBar;

  return render(
    <KibanaContextProvider services={{ ...coreMock.createStart(), unifiedSearch }}>
      <EntityInventorySearchProvider entityCategory={entityCategory}>
        <EntityInventorySearchBar />
      </EntityInventorySearchProvider>
    </KibanaContextProvider>
  );
};

describe('EntityInventorySearchBar', () => {
  beforeEach(() => {
    MockSearchBar.mockClear();
  });

  it('renders a controlled unified search bar with the legacy date picker', () => {
    renderSearchBar();

    expect(lastSearchBarProps()).toEqual(
      expect.objectContaining({
        appName: ENTITY_INVENTORY_APP_NAME,
        enableDateRangePicker: false,
        useDefaultBehaviors: false,
        showDatePicker: true,
        showFilterBar: true,
        hiddenFilterPanelOptions: ['pinFilter'],
        showQueryInput: true,
        showQueryMenu: true,
        showSavedQueryControls: false,
        dateRangeFrom: 'now-15m',
        dateRangeTo: 'now',
        filters: [],
        query: { language: 'kuery', query: '' },
        indexPatterns: undefined,
      })
    );
    expect(lastSearchBarProps().allowSavingQueries).toBeFalsy();
  });

  it.each(['all', 'hosts', 'kubernetes'] as const)(
    'uses the %s placeholder for the entity category',
    (entityCategory) => {
      renderSearchBar(entityCategory);

      expect(lastSearchBarProps().placeholder).toBe(SEARCH_BAR_PLACEHOLDERS[entityCategory]);
    }
  );

  it('renders the maximum time range hint', () => {
    renderSearchBar();

    expect(screen.getByTestId('entityInventoryMaxTimeRangeHint')).toHaveTextContent(
      MAX_TIME_RANGE_HINT
    );
  });

  it('passes the clamped range back to the search bar after an over-limit submission', () => {
    renderSearchBar();

    fireEvent.click(screen.getByTestId('mockSearchBarPick7d'));

    expect(lastSearchBarProps().dateRangeFrom).toBe('now-3d');
    expect(screen.getByTestId('mockSearchBarPick7d')).toHaveAttribute('data-picker-from', 'now-3d');
  });

  it('resets the picker to the clamped range when the committed range did not change', () => {
    renderSearchBar();

    fireEvent.click(screen.getByTestId('mockSearchBarPick7d'));
    fireEvent.click(screen.getByTestId('mockSearchBarPick7d'));

    expect(screen.getByTestId('mockSearchBarPick7d')).toHaveAttribute('data-picker-from', 'now-3d');
  });

  it('updates the filters passed to the search bar', () => {
    renderSearchBar();
    const filters: Filter[] = [{ meta: { key: 'host.name' }, query: { match_all: {} } }];

    act(() => {
      lastSearchBarProps().onFiltersUpdated?.(filters);
    });

    expect(lastSearchBarProps().filters).toBe(filters);
  });
});
