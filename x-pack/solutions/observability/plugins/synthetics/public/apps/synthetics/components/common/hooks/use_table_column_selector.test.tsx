/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { useTableColumnSelector } from './use_table_column_selector';

jest.mock('../../../../../hooks/use_kibana_space', () => ({
  useKibanaSpace: () => ({ space: { id: 'default' } }),
}));

const STORAGE_KEY_PREFIX = 'synthetics.test.columns.v1.';
const STORAGE_KEY = `${STORAGE_KEY_PREFIX}default`;

const allColumns = [
  { name: 'Always' },
  { id: 'type', field: 'type', name: 'Type' },
  { id: 'created_at', field: 'created_at', name: 'Created' },
  { id: 'updated_at', field: 'updated_at', name: 'Last modified' },
  { name: 'Actions' },
];

const defaultVisibleColumnIds = ['type', 'updated_at'];

const refreshSnapshotCache = () => {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: null,
      storageArea: window.localStorage,
    })
  );
};

describe('useTableColumnSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
    refreshSnapshotCache();
  });

  it('keeps columns without an id visible and hides non-default selectable columns', () => {
    const { result } = renderHook(() =>
      useTableColumnSelector({
        columns: allColumns,
        defaultVisibleColumnIds,
        storageKeyPrefix: STORAGE_KEY_PREFIX,
      })
    );

    expect(result.current.columns.map((col) => col.name)).toEqual([
      'Always',
      'Type',
      'Last modified',
      'Actions',
    ]);

    const { getByText } = render(<>{result.current.ColumnSelector}</>);
    expect(getByText('Columns')).toBeInTheDocument();
  });

  it('restores a previously saved visible-column list from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(['created_at']));
    refreshSnapshotCache();

    const { result } = renderHook(() =>
      useTableColumnSelector({
        columns: allColumns,
        defaultVisibleColumnIds,
        storageKeyPrefix: STORAGE_KEY_PREFIX,
      })
    );

    expect(result.current.columns.map((col) => col.name)).toEqual(['Always', 'Created', 'Actions']);
  });

  it('does not loop when the parent passes a new columns array each render', () => {
    const makeColumns = () => allColumns.map((col) => ({ ...col }));
    const { result, rerender } = renderHook(
      ({ columns }) =>
        useTableColumnSelector({
          columns,
          defaultVisibleColumnIds,
          storageKeyPrefix: STORAGE_KEY_PREFIX,
        }),
      { initialProps: { columns: makeColumns() } }
    );

    const view = render(<>{result.current.ColumnSelector}</>);
    for (let i = 0; i < 25; i++) {
      rerender({ columns: makeColumns() });
      view.rerender(<>{result.current.ColumnSelector}</>);
    }

    expect(result.current.columns.map((col) => col.name)).toEqual([
      'Always',
      'Type',
      'Last modified',
      'Actions',
    ]);
    expect(view.getByText('Columns')).toBeInTheDocument();
  });
});
