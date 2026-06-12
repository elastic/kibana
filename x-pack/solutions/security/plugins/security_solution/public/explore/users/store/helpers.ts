/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserFlyoutQueries, UserAssetTableType, UsersModel, UsersQueries } from './model';
import { UsersTableType } from './model';
import { DEFAULT_TABLE_ACTIVE_PAGE } from '../../../common/store/constants';

export const setUsersPageQueriesActivePageToZero = (state: UsersModel): UsersQueries => ({
  ...state.page.queries,
  [UsersTableType.allUsers]: {
    ...state.page.queries[UsersTableType.allUsers],
    activePage: DEFAULT_TABLE_ACTIVE_PAGE,
  },
});

interface UpsertAssetTableFieldParams {
  fieldName: string;
  tableId: UserAssetTableType;
  tableById: UserFlyoutQueries;
}

export const addAssetTableField = ({
  tableById,
  tableId,
  fieldName,
}: UpsertAssetTableFieldParams): UserFlyoutQueries => {
  const table = tableById[tableId];

  if (table.fields.includes(fieldName)) {
    // Do not add the field if it already exists
    return tableById;
  }

  return {
    ...tableById,
    [tableId]: {
      ...table,
      fields: [fieldName, ...table.fields],
    },
  };
};

interface RemoveAssetTableFieldParams {
  tableId: UserAssetTableType;
  fieldName: string;
  tableById: UserFlyoutQueries;
}

export const removeAssetTableField = ({
  tableId,
  fieldName,
  tableById,
}: RemoveAssetTableFieldParams): UserFlyoutQueries => {
  const table = tableById[tableId];

  const fields = table.fields.filter((c) => c !== fieldName);

  return {
    ...tableById,
    [tableId]: {
      ...table,
      fields,
    },
  };
};
