/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MigrationRulesTable } from '.';
import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useGetMigrationPrebuiltRules } from '../../logic/use_get_migration_prebuilt_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useInstallMigrationRule } from '../../logic/use_install_migration_rule';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useStartMigration } from '../../logic/use_start_migration';
import { useUpdateIndexPattern } from '../../logic/use_update_index_pattern';
import {
  getRuleMigrationStatsMock,
  getRuleMigrationTranslationStatsMock,
} from '../../__mocks__/migration_rule_stats';
import { migrationRules } from '../../__mocks__/migration_rules';
import { useMigrationRuleDetailsFlyout } from '../../hooks/use_migration_rule_preview_flyout';
import { useStartRulesMigrationModal } from '../../hooks/use_start_rules_migration_modal';
import { useMigrationRulesTableColumns } from '../../hooks/use_migration_rules_table_columns';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../logic/use_get_migration_rules');
jest.mock('../../logic/use_get_migration_prebuilt_rules');
jest.mock('../../logic/use_get_migration_translation_stats');
jest.mock('../../logic/use_install_migration_rule');
jest.mock('../../logic/use_install_migration_rules');
jest.mock('../../logic/use_update_index_pattern');
jest.mock('../../logic/use_start_migration');
jest.mock('../../hooks/use_migration_rule_preview_flyout');
jest.mock('../../hooks/use_start_rules_migration_modal');
jest.mock('../../hooks/use_migration_rules_table_columns');

const mockRule = migrationRules[0];
const mockMigrationStats = getRuleMigrationStatsMock();
const mockTranslationStats = getRuleMigrationTranslationStatsMock();

describe('MigrationRulesTable', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: { getMissingCapabilities: jest.fn().mockReturnValue([]) },
        },
      },
    });
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    (useGetMigrationRules as jest.Mock).mockReturnValue({
      data: { migrationRules: [], total: 0 },
      isLoading: false,
    });
    (useGetMigrationPrebuiltRules as jest.Mock).mockReturnValue({ data: {}, isLoading: false });
    (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
      data: mockTranslationStats,
      isLoading: false,
    });
    (useMigrationRulesTableColumns as jest.Mock).mockReturnValue([false, []]);
    (useMigrationRuleDetailsFlyout as jest.Mock).mockReturnValue([jest.fn()]);
    (useInstallMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useInstallMigrationRules as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdateIndexPattern as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useStartRulesMigrationModal as jest.Mock).mockReturnValue([jest.fn()]);
    (useStartMigration as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the skeleton while loading stats', () => {
    const { getByTestId } = render(<MigrationRulesTable migrationStats={mockMigrationStats} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('migrationRulesTableSkeleton')).toBeInTheDocument();
  });

  test('renders the empty component when there are no rules', () => {
    (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
      data: {
        ...mockTranslationStats,
        rules: {
          total: 0,
          success: {
            total: 0,
            result: {
              full: 0,
              partial: 0,
              untranslatable: 0,
            },
            installable: 0,
            prebuilt: 0,
            missing_index: 0,
          },
          failed: 0,
        },
      },
      isLoading: false,
    });

    const { getByTestId } = render(<MigrationRulesTable migrationStats={mockMigrationStats} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('emptyMigrationContainer')).toBeInTheDocument();
  });

  test('renders the table with rules', async () => {
    (useGetMigrationRules as jest.Mock).mockReturnValue({
      data: { migrationRules: [mockRule], total: 1 },
      isLoading: false,
    });
    const { getByTestId } = render(<MigrationRulesTable migrationStats={mockMigrationStats} />, {
      wrapper: TestProviders,
    });

    expect(getByTestId('siemMigrationsRulesTable')).toBeInTheDocument();
  });
});
