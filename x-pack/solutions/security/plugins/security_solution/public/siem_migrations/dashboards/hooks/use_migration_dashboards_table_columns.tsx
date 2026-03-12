/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type {
  CreateActionsColumnParams,
  CreateNameColumnParams,
  TableColumn,
} from '../components/dashboard_table_columns';
import {
  createActionsColumn,
  createNameColumn,
  createStatusColumn,
  createTagsColumn,
  createUpdatedColumn,
} from '../components/dashboard_table_columns';

type UseMigrationDashboardsTableColumnsParams = CreateActionsColumnParams & CreateNameColumnParams;

export const useMigrationDashboardsTableColumns = ({
  installDashboard,
  openDashboardDetailsFlyout,
  shouldDisableActions,
}: UseMigrationDashboardsTableColumnsParams): TableColumn[] => {
  return useMemo(
    () => [
      createNameColumn({
        openDashboardDetailsFlyout,
      }),
      createUpdatedColumn(),
      createStatusColumn(),
      createTagsColumn(),
      createActionsColumn({
        shouldDisableActions,
        installDashboard,
      }),
    ],
    [installDashboard, openDashboardDetailsFlyout, shouldDisableActions]
  );
};
