/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { createSelector } from 'reselect';
import { getDataTableManageDefaults, tableDefaults } from './defaults';
import type { DataTableModel, DataTableState, TableById } from './types';

const selectTableById = (state: DataTableState): TableById => state.dataTable.tableById;

export const tableByIdSelector = createSelector(selectTableById, (tableById) => tableById);

export const createTableSelector = (tableId: string) =>
  createSelector(tableByIdSelector, (tableById: TableById) => tableById[tableId]);

const selectTable = (state: DataTableState, tableId: string): DataTableModel =>
  state.dataTable.tableById[tableId];

export const getTableByIdSelector = () => createSelector(selectTable, (table) => table);

const getDefaultTgrid = (id: string) => ({ ...tableDefaults, ...getDataTableManageDefaults(id) });

const selectTGridById = (state: unknown, tableId: string): DataTableModel => {
  return getOr(
    getOr(getDefaultTgrid(tableId), ['tableById', tableId], state),
    ['dataTable', 'tableById', tableId],
    state
  );
};

export const getManageDataTableById = () =>
  createSelector(
    selectTGridById,
    ({ dataViewId, defaultColumns, isLoading, loadingText, queryFields, title, selectAll }) => ({
      dataViewId,
      defaultColumns,
      isLoading,
      loadingText,
      queryFields,
      title,
      selectAll,
    })
  );
