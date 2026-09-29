/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useMigrationRulesTableColumns } from './use_migration_rules_table_columns';
import * as columns from '../components/rules_table_columns';
import { createIntegrationsColumn } from '../components/rules_table_columns/integrations';

vi.mock('../components/rules_table_columns', () => {
      const mocked = {
      createUpdatedColumn: vi.fn(),
      createNameColumn: vi.fn(),
      createStatusColumn: vi.fn(),
      createRiskScoreColumn: vi.fn(),
      createSeverityColumn: vi.fn(),
      createAuthorColumn: vi.fn(),
      createActionsColumn: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../components/rules_table_columns/integrations', () => {
      const mocked = {
      createIntegrationsColumn: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useMigrationRulesTableColumns', () => {
  const mockOpenMigrationRuleDetails = vi.fn();
  const mockInstallMigrationRule = vi.fn();
  const mockGetMigrationRuleData = vi.fn();

  it('should call all create column functions with the correct arguments', () => {
    const { result } = renderHook(() =>
      useMigrationRulesTableColumns({
        openMigrationRuleDetails: mockOpenMigrationRuleDetails,
        installMigrationRule: mockInstallMigrationRule,
        getMigrationRuleData: mockGetMigrationRuleData,
      })
    );

    expect(columns.createUpdatedColumn).toHaveBeenCalled();
    expect(columns.createNameColumn).toHaveBeenCalledWith({
      openMigrationRuleDetails: mockOpenMigrationRuleDetails,
    });
    expect(columns.createStatusColumn).toHaveBeenCalled();
    expect(columns.createRiskScoreColumn).toHaveBeenCalled();
    expect(columns.createSeverityColumn).toHaveBeenCalled();
    expect(columns.createAuthorColumn).toHaveBeenCalled();
    expect(createIntegrationsColumn).toHaveBeenCalledWith({
      getMigrationRuleData: mockGetMigrationRuleData,
    });
    expect(columns.createActionsColumn).toHaveBeenCalledWith({
      disableActions: undefined,
      openMigrationRuleDetails: mockOpenMigrationRuleDetails,
      installMigrationRule: mockInstallMigrationRule,
    });

    expect(result.current).toHaveLength(8);
  });

  it('should pass disableActions to createActionsColumn', () => {
    renderHook(() =>
      useMigrationRulesTableColumns({
        disableActions: true,
        openMigrationRuleDetails: mockOpenMigrationRuleDetails,
        installMigrationRule: mockInstallMigrationRule,
        getMigrationRuleData: mockGetMigrationRuleData,
      })
    );

    expect(columns.createActionsColumn).toHaveBeenCalledWith({
      disableActions: true,
      openMigrationRuleDetails: mockOpenMigrationRuleDetails,
      installMigrationRule: mockInstallMigrationRule,
    });
  });
});
