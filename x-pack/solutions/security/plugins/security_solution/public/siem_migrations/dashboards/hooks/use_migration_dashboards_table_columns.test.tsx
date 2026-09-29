/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useMigrationDashboardsTableColumns } from './use_migration_dashboards_table_columns';
import * as columns from '../components/dashboard_table_columns';

vi.mock('../components/dashboard_table_columns', () => {
  const mocked = {
    createActionsColumn: vi.fn(),
    createNameColumn: vi.fn(),
    createStatusColumn: vi.fn(),
    createTagsColumn: vi.fn(),
    createUpdatedColumn: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('useMigrationDashboardsTableColumns', () => {
  const installDashboard = vi.fn();
  const openDashboardDetailsFlyout = vi.fn();

  it('should return the correct columns', () => {
    const { result } = renderHook(() =>
      useMigrationDashboardsTableColumns({
        installDashboard,
        openDashboardDetailsFlyout,
        shouldDisableActions: true,
      })
    );

    expect(result.current).toHaveLength(5);
    expect(columns.createNameColumn).toHaveBeenCalledWith({
      openDashboardDetailsFlyout,
    });
    expect(columns.createUpdatedColumn).toHaveBeenCalled();
    expect(columns.createStatusColumn).toHaveBeenCalled();
    expect(columns.createTagsColumn).toHaveBeenCalled();
    expect(columns.createActionsColumn).toHaveBeenCalledWith({
      shouldDisableActions: true,
      installDashboard,
    });
  });
});
