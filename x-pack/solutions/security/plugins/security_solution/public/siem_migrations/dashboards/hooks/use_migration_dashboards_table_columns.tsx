/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TableColumn } from '../components/dashboard_table_columns';
import {
  createNameColumn,
  createStatusColumn,
  createTagsColumn,
  createUpdatedColumn,
} from '../components/dashboard_table_columns';

export const useMigrationDashboardsTableColumns = (): TableColumn[] => {
  return useMemo(
    () => [createNameColumn(), createUpdatedColumn(), createStatusColumn(), createTagsColumn()],
    []
  );
};
