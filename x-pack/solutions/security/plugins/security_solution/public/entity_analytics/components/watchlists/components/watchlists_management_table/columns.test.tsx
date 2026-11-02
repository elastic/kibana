/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { EuiTableFieldDataColumnType, EuiThemeComputed } from '@elastic/eui';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import type { WatchlistTableItemType } from './types';
import { buildWatchlistsManagementTableColumns } from './columns';

describe('buildWatchlistsManagementTableColumns', () => {
  const euiTheme = {} as unknown as EuiThemeComputed;
  const mockRecord: WatchlistTableItemType = {
    name: 'test-watchlist',
    managed: false,
    riskModifier: 1,
  };

  const getColumns = () =>
    buildWatchlistsManagementTableColumns(
      euiTheme,
      jest.fn(), // onEdit
      jest.fn() // onDelete
    );

  const getReadOnlyColumns = () =>
    buildWatchlistsManagementTableColumns(
      euiTheme,
      jest.fn(), // onEdit
      jest.fn(), // onDelete
      false
    );

  const getColumnByField = (field: string) =>
    getColumns().find((column) => 'field' in column && column.field === field) as
      | EuiTableFieldDataColumnType<WatchlistTableItemType>
      | undefined;

  const getActionsColumn = () =>
    getColumns().find((column) => !('field' in column) && 'name' in column);

  const getRenderableColumnByField = (field: string) =>
    getColumns().find(
      (column) => 'field' in column && column.field === field && 'render' in column
    ) as EuiTableFieldDataColumnType<WatchlistTableItemType> | undefined;

  it('renders watchlist name column', () => {
    const column = getColumnByField('name');
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('renders number of entities column', () => {
    const column = getColumnByField('entityCount');
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('renders risk score weighting column', () => {
    const column = getColumnByField('riskModifier');
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('renders source column', () => {
    const column = getColumnByField('source');
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('renders last updated column', () => {
    const column = getColumnByField('updatedAt');
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('renders actions column', () => {
    const column = getActionsColumn();
    expect(column).toBeTruthy();
    if (!column) return;
    expect(column.name).toBeTruthy();
  });

  it('does not render actions column when write access is disabled', () => {
    const actionsColumn = getReadOnlyColumns().find(
      (column) => !('field' in column) && 'name' in column
    );
    expect(actionsColumn).toBeUndefined();
  });

  it('renders risk score weighting value when provided', () => {
    const column = getRenderableColumnByField('riskModifier');
    const rendered = column?.render?.(1.5, mockRecord);
    expect(rendered).toBe(1.5);
  });

  it('renders last updated as a relative time element when provided', () => {
    const column = getRenderableColumnByField('updatedAt');
    const rendered = column?.render?.('2026-02-23T11:00:00.000Z', mockRecord);
    expect(rendered).not.toEqual(getEmptyTagValue());
    expect(React.isValidElement(rendered)).toBe(true);
  });
});
