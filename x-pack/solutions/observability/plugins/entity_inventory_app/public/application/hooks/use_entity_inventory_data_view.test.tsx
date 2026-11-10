/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { act, renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import type { EntityInventoryEntityCategory } from '../../types';
import { EntityInventorySearchProvider, useEntityInventorySearch } from '../context/search_context';
import { useEntityInventoryDataView } from './use_entity_inventory_data_view';

const definition = (
  type: string,
  category: string,
  indexPatterns: string[]
): EntityInventoryTypeDefinition => ({
  type,
  name: type,
  category,
  sources: indexPatterns.map((indexPattern) => ({ indexPattern })),
  attributes: [],
});

const TYPES = [
  definition('one', 'hosts', ['logs-b-*', 'logs-a-*']),
  definition('two', 'hosts', ['logs-a-*']),
  definition('three', 'kubernetes', ['logs-c-*']),
];

let mockTypes: EntityInventoryTypeDefinition[] = TYPES;

jest.mock('./use_entity_inventory_types', () => ({
  useEntityInventoryTypes: () => ({ types: mockTypes, isLoading: false }),
}));

const dataViewOf = (title: string) => ({
  id: `entity-inventory:${title}`,
  title,
  timeFieldName: '@timestamp',
  allowNoIndex: true,
});

const renderDataViewHook = (entityCategory: EntityInventoryEntityCategory) => {
  const dataViews = dataViewPluginMocks.createStartContract();
  const dataView = { title: 'created', fields: [] } as unknown as DataView;
  (dataViews.create as jest.Mock).mockResolvedValue(dataView);
  const history = createMemoryHistory();

  const wrapper = ({ children }: { children?: React.ReactNode }) => (
    <KibanaContextProvider services={{ ...coreMock.createStart(), dataViews }}>
      <Router history={history}>
        <EntityInventorySearchProvider entityCategory={entityCategory}>
          {children}
        </EntityInventorySearchProvider>
      </Router>
    </KibanaContextProvider>
  );

  return {
    dataViews,
    dataView,
    ...renderHook(() => ({ ...useEntityInventoryDataView(), search: useEntityInventorySearch() }), {
      wrapper,
    }),
  };
};

describe('useEntityInventoryDataView', () => {
  beforeEach(() => {
    mockTypes = TYPES;
  });

  it('creates no data view while there are no types', () => {
    mockTypes = [];

    const { dataViews, result } = renderDataViewHook('all');

    expect(dataViews.create).not.toHaveBeenCalled();
    expect(result.current.dataView).toBeUndefined();
  });

  it('uses every type when no category is selected', async () => {
    const { dataViews, dataView, result } = renderDataViewHook('all');

    await waitFor(() => expect(result.current.dataView).toBe(dataView));

    expect(dataViews.create).toHaveBeenCalledWith(dataViewOf('logs-a-*,logs-b-*,logs-c-*'));
  });

  it('combines the index patterns of the types in scope, without repeats and in order', async () => {
    const { dataViews, dataView, result } = renderDataViewHook('hosts');

    await waitFor(() => expect(result.current.dataView).toBe(dataView));

    expect(dataViews.create).toHaveBeenCalledTimes(1);
    expect(dataViews.create).toHaveBeenCalledWith(dataViewOf('logs-a-*,logs-b-*'));
  });

  it('creates a data view for the new scope when the selection changes', async () => {
    const { dataViews, result } = renderDataViewHook('all');

    act(() => result.current.search.setFilterControls({ category: 'kubernetes', attributes: {} }));
    await waitFor(() => expect(dataViews.create).toHaveBeenCalledWith(dataViewOf('logs-c-*')));

    act(() =>
      result.current.search.setFilterControls({ category: 'hosts', type: 'two', attributes: {} })
    );
    await waitFor(() => expect(dataViews.create).toHaveBeenCalledWith(dataViewOf('logs-a-*')));
  });

  it('creates the data view only once for the same scope', async () => {
    const { dataViews, dataView, result, rerender } = renderDataViewHook('hosts');

    await waitFor(() => expect(result.current.dataView).toBe(dataView));
    rerender();

    expect(dataViews.create).toHaveBeenCalledTimes(1);
  });
});
