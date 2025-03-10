/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableState, TableId } from '@kbn/securitysolution-data-table';
import { tableEntity, TableEntityType } from '@kbn/securitysolution-data-table';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { LOCAL_STORAGE_TABLE_KEY } from '.';
import {
  hostRiskLevelColumn,
  userRiskLevelColumn,
} from '../../../detections/configurations/security_solution_detections/columns';

export const LOCAL_STORAGE_MIGRATION_KEY =
  'securitySolution.dataTable.entityRiskLevelColumnTitleMigration';

export const migrateEntityRiskLevelColumnTitle = (
  storage: Storage,
  dataTableState: DataTableState['dataTable']['tableById']
) => {
  //  Set/Get a flag to prevent migration from running more than once
  const hasAlreadyMigrated: boolean = storage.get(LOCAL_STORAGE_MIGRATION_KEY);
  if (hasAlreadyMigrated) {
    return;
  }
  storage.set(LOCAL_STORAGE_MIGRATION_KEY, true);

  let updatedTableModel = false;

  for (const [tableId, tableModel] of Object.entries(dataTableState)) {
    // Only updates the title for alerts tables
    if (tableEntity[tableId as TableId] === TableEntityType.alert) {
      // In order to show correct column title after user upgrades to 8.13 we need update the stored table model with the new title.
      const columns = tableModel.columns;
      if (Array.isArray(columns)) {
        columns.forEach((col) => {
          if (col.id === userRiskLevelColumn.id) {
            col.displayAsText = userRiskLevelColumn.displayAsText;
            updatedTableModel = true;
          }

          if (col.id === hostRiskLevelColumn.id) {
            col.displayAsText = hostRiskLevelColumn.displayAsText;
            updatedTableModel = true;
          }
        });
      }
    }
  }
  if (updatedTableModel) {
    storage.set(LOCAL_STORAGE_TABLE_KEY, dataTableState);
  }
};
