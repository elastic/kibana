/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MigrationRulesTable } from '.';
import { TestProviders } from '../../../../common/mock';
import { useKibana } from '../../../../common/lib/kibana';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useGetMigrationPrebuiltRules } from '../../logic/use_get_migration_prebuilt_rules';
import { useGetMigrationRules } from '../../logic/use_get_migration_rules';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { useInstallMigrationRule } from '../../logic/use_install_migration_rule';
import { useInstallMigrationRules } from '../../logic/use_install_migration_rules';
import { useUpdateMigrationRule } from '../../logic/use_update_migration_rule';
import { useUpdateIndexPattern } from '../../logic/use_update_index_pattern';
import { useStartMigration } from '../../logic/use_start_migration';
import { useBulkGetUserProfiles } from '../../../../common/components/user_profiles/use_bulk_get_user_profiles';
import {
  getRuleMigrationStatsMock,
  getRuleMigrationTranslationStatsMock,
} from '../../__mocks__/migration_rule_stats';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../logic/use_get_migration_rules');
jest.mock('../../logic/use_get_migration_prebuilt_rules');
jest.mock('../../logic/use_get_migration_translation_stats');
jest.mock('../../logic/use_install_migration_rule');
jest.mock('../../logic/use_install_migration_rules');
jest.mock('../../logic/use_update_migration_rule');
jest.mock('../../logic/use_update_index_pattern');
jest.mock('../../logic/use_start_migration');
jest.mock('../../../../common/components/user_profiles/use_bulk_get_user_profiles');

const makeTranslatedRule = (id: string, title: string): RuleMigrationRule => ({
  id,
  migration_id: 'migration-1',
  original_rule: {
    id: `orig-${id}`,
    vendor: 'qradar',
    title,
    description: `${title} description`,
    query: 'event category authentication',
    query_language: 'aql',
  },
  '@timestamp': '2025-05-06T07:53:48.805Z',
  status: SiemMigrationStatus.COMPLETED,
  created_by: 'test-user',
  updated_by: 'test-user',
  updated_at: '2025-05-06T07:57:24.929Z',
  translation_result: 'full',
  elastic_rule: {
    severity: 'low',
    risk_score: 21,
    query: 'FROM logs-* | WHERE event.category == "authentication"',
    query_language: 'esql',
    description: `${title} description`,
    title,
  },
});

const makeUntranslatableRule = (id: string, title: string): RuleMigrationRule => ({
  id,
  migration_id: 'migration-1',
  original_rule: {
    id: `orig-${id}`,
    vendor: 'qradar',
    title,
    description: `${title} description`,
    query: 'complex unsupported query',
    query_language: 'aql',
  },
  '@timestamp': '2025-05-06T07:53:48.805Z',
  status: SiemMigrationStatus.COMPLETED,
  created_by: 'test-user',
  updated_by: 'test-user',
  updated_at: '2025-05-06T07:57:24.929Z',
  translation_result: 'untranslatable',
});

const threeRules: RuleMigrationRule[] = [
  makeTranslatedRule('rule-1', 'First Rule'),
  makeUntranslatableRule('rule-2', 'Second Rule'),
  makeTranslatedRule('rule-3', 'Third Rule'),
];

const mockMigrationStats = getRuleMigrationStatsMock();
const mockInstallMutate = jest.fn().mockResolvedValue({ installed: 1 });

const openFlyoutForRule = (title: string) => {
  const link = screen.getByText(title);
  fireEvent.click(link);
};

describe('MigrationRulesTable navigation (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        siemMigrations: {
          rules: { getMissingCapabilities: jest.fn().mockReturnValue([]) },
        },
      },
    });
    (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());
    (useGetMigrationRules as jest.Mock).mockReturnValue({
      data: { migrationRules: threeRules, total: threeRules.length },
      isLoading: false,
    });
    (useGetMigrationPrebuiltRules as jest.Mock).mockReturnValue({ data: {}, isLoading: false });
    (useGetMigrationTranslationStats as jest.Mock).mockReturnValue({
      data: getRuleMigrationTranslationStatsMock({
        rules: {
          total: 3,
          success: {
            total: 3,
            result: { full: 2, partial: 0, untranslatable: 1 },
            installable: 2,
            prebuilt: 0,
            missing_index: 0,
          },
          failed: 0,
        },
      }),
      isLoading: false,
    });
    (useInstallMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: mockInstallMutate });
    (useInstallMigrationRules as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdateMigrationRule as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useUpdateIndexPattern as jest.Mock).mockReturnValue({ mutateAsync: jest.fn() });
    (useStartMigration as jest.Mock).mockReturnValue({
      startMigration: jest.fn(),
      isLoading: false,
    });
    (useBulkGetUserProfiles as jest.Mock).mockReturnValue({ isLoading: false, data: [] });
  });

  const renderTable = () =>
    render(<MigrationRulesTable migrationStats={mockMigrationStats} />, { wrapper: TestProviders });

  it('should open the details flyout for the clicked rule', () => {
    renderTable();
    openFlyoutForRule('First Rule');

    expect(screen.getByTestId('ruleMigrationDetailsFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
  });

  it('should show the next rule when the user navigates forward', () => {
    renderTable();
    openFlyoutForRule('First Rule');

    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Second Rule');
  });

  it('should return to the previous rule when the user navigates backward', () => {
    renderTable();
    openFlyoutForRule('Second Rule');

    fireEvent.click(screen.getByTestId('migrationFlyoutPreviousButton'));

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('First Rule');
  });

  it('should disable the arrows at the page boundaries', () => {
    renderTable();
    openFlyoutForRule('First Rule');

    expect(screen.getByTestId('migrationFlyoutPreviousButton')).toBeDisabled();
    expect(screen.getByTestId('migrationFlyoutNextButton')).toBeEnabled();

    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));
    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Third Rule');
    expect(screen.getByTestId('migrationFlyoutNextButton')).toBeDisabled();
    expect(screen.getByTestId('migrationFlyoutPreviousButton')).toBeEnabled();
  });

  it('should reset to the first enabled tab when navigating to a rule that cannot show the selected tab', () => {
    renderTable();
    openFlyoutForRule('First Rule');

    fireEvent.click(screen.getByTestId('tabOverview'));
    expect(screen.getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));

    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Second Rule');
    expect(screen.getByTestId('tabOverview')).toBeDisabled();
    expect(screen.getByTestId('tabOverview')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('tabTranslation')).toHaveAttribute('aria-selected', 'true');
  });

  it('should install the rule currently shown after navigating', () => {
    renderTable();
    openFlyoutForRule('First Rule');

    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));
    fireEvent.click(screen.getByTestId('migrationFlyoutNextButton'));
    expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Third Rule');

    fireEvent.click(screen.getByTestId('installMigrationRuleFromFlyoutButton'));

    expect(mockInstallMutate).toHaveBeenCalledWith(
      expect.objectContaining({ migrationRule: expect.objectContaining({ id: 'rule-3' }) })
    );
  });

  it('should close the flyout when close button is clicked', () => {
    renderTable();
    openFlyoutForRule('First Rule');
    expect(screen.getByTestId('ruleMigrationDetailsFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('detailsFlyoutCloseButton'));
    expect(screen.queryByTestId('ruleMigrationDetailsFlyout')).not.toBeInTheDocument();
  });
});
