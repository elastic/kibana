/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type {
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiThemeComputed,
} from '@elastic/eui';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { WatchlistTableItemType } from './types';
import { buildWatchlistsManagementTableColumns } from './columns';

describe('buildWatchlistsManagementTableColumns', () => {
  const euiTheme = {} as unknown as EuiThemeComputed;

  const getColumns = () => buildWatchlistsManagementTableColumns(euiTheme);

  const getColumnByField = (field: string): EuiBasicTableColumn<WatchlistTableItemType> =>
    getColumns().find(
      (column): column is EuiBasicTableColumn<WatchlistTableItemType> =>
        'field' in column && column.field === field
    ) as EuiBasicTableColumn<WatchlistTableItemType>;

  const getActionsColumn = (): EuiBasicTableColumn<WatchlistTableItemType> =>
    getColumns().find(
      (column): column is EuiBasicTableColumn<WatchlistTableItemType> =>
        !('field' in column) && 'name' in column
    ) as EuiBasicTableColumn<WatchlistTableItemType>;

  const getRenderableColumnByField = (
    field: string
  ): EuiTableFieldDataColumnType<WatchlistTableItemType> =>
    getColumns().find(
      (column): column is EuiTableFieldDataColumnType<WatchlistTableItemType> =>
        'field' in column && column.field === field && 'render' in column
    ) as EuiTableFieldDataColumnType<WatchlistTableItemType>;

  it('renders watchlist name column', () => {
    const column = getColumnByField('name');
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders number of users column', () => {
    const column = getColumnByField('users.length');
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders risk score weighting column', () => {
    const column = getColumnByField('riskModifier');
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders source column', () => {
    const column = getColumnByField('source');
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders last updated column', () => {
    const column = getColumnByField('updatedAt');
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders actions column', () => {
    const column = getActionsColumn();
    expect(column).toBeTruthy();
    expect(column.name).toBeTruthy();
  });

  it('renders empty tag for missing number of users', () => {
    const column = getRenderableColumnByField('users.length');
    const rendered = column.render?.(undefined, {} as WatchlistTableItemType);
    expect(rendered).toEqual(getEmptyTagValue());
  });

  it('renders risk score weighting value when provided', () => {
    const column = getRenderableColumnByField('riskModifier');
    const rendered = column.render?.(1.5, {} as WatchlistTableItemType);
    expect(rendered).toBe(1.5);
  });

  it('renders last updated as a relative time element when provided', () => {
    const column = getRenderableColumnByField('updatedAt');
    const rendered = column.render?.('2026-02-23T11:00:00.000Z', {} as WatchlistTableItemType);
    expect(rendered).not.toEqual(getEmptyTagValue());
    expect(React.isValidElement(rendered)).toBe(true);
  });
});
