/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RuleMigrationResultPanel } from './migration_result_panel';
import { TestProviders } from '../../../../common/mock';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import type { RuleMigrationStats } from '../../types';
import * as i18n from './translations';
import { MigrationDataInputContextProvider } from '../../../common/components';
import * as useGetMissingResourcesModule from '../../../common/hooks/use_get_missing_resources';

jest.mock('../../../../common/lib/kibana/use_kibana');

jest.mock('../../logic/use_get_migration_translation_stats', () => ({
  useGetMigrationTranslationStats: jest.fn().mockReturnValue({
    data: {
      rules: {
        success: { result: { full: 1, partial: 2, untranslatable: 3 } },
        failed: 4,
      },
    },
    isLoading: false,
  }),
}));

const baseProps = {
  migrationStats: {
    id: '1',
    created_at: '2023-01-01T00:00:00Z',
    last_updated_at: '2024-01-01T01:00:00Z',
    last_execution: {},
  } as RuleMigrationStats,
  isCollapsed: false,
  onToggleCollapsed: jest.fn(),
};

const mockGetMissingResources = jest.fn();

const mockUseGetMissingResources = jest.spyOn(
  useGetMissingResourcesModule,
  'useGetMissingResources'
);
mockUseGetMissingResources.mockImplementation((_, setterFn) => {
  return {
    getMissingResources: jest.fn().mockImplementation(() => {
      const missingResources = mockGetMissingResources();
      setterFn(missingResources);
    }),
    isLoading: false,
    error: null,
  };
});

const renderTestComponent = (
  props: Partial<React.ComponentProps<typeof RuleMigrationResultPanel>> = {}
) => {
  return render(<RuleMigrationResultPanel {...baseProps} {...props} />, {
    wrapper: ({ children }) => (
      <TestProviders>
        <MigrationDataInputContextProvider openFlyout={jest.fn()} closeFlyout={jest.fn()}>
          {children}
        </MigrationDataInputContextProvider>
      </TestProviders>
    ),
  });
};

describe('RuleMigrationResultPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMissingResources.mockReturnValue([]);
  });
  it('renders panel with title, badge, and button', async () => {
    renderTestComponent();
    await waitFor(() => expect(screen.getByTestId('migrationPanelTitle')).toBeInTheDocument());
    const badge = screen.getByText(i18n.RULE_MIGRATION_COMPLETE_BADGE);
    expect(badge).toBeInTheDocument();
    const button = screen.getByRole('button', { name: i18n.RULE_MIGRATION_COLLAPSE });
    expect(button).toBeInTheDocument();
    expect(screen.getByText(/Export uploaded on/)).toBeInTheDocument();
  });

  it('calls onToggleCollapsed when button is clicked', async () => {
    renderTestComponent();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: i18n.RULE_MIGRATION_COLLAPSE })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: i18n.RULE_MIGRATION_COLLAPSE }));
    expect(baseProps.onToggleCollapsed).toHaveBeenCalled();
  });

  it('renders error if last_execution.error is present', () => {
    renderTestComponent({
      migrationStats: {
        ...baseProps.migrationStats,
        last_execution: { error: 'Something went wrong' },
      },
    });
    expect(screen.getByTestId(/ruleMigrationLastError/)).toBeVisible();
  });

  it('renders loading spinner if translation stats are loading', () => {
    (useGetMigrationTranslationStats as jest.Mock).mockImplementationOnce(() => ({
      data: undefined,
      isLoading: true,
    }));
    renderTestComponent();
    expect(screen.getByTestId('centeredLoadingSpinner')).toBeInTheDocument();
  });

  it('renders table when translation stats are loaded', async () => {
    renderTestComponent();
    await waitFor(() => expect(screen.getByTestId('translatedResultsTable')).toBeInTheDocument());
  });

  it('renders upload missing panel', () => {
    mockGetMissingResources.mockReturnValue([{}]);
    renderTestComponent();
    expect(screen.getByText(/Click Upload to continue translating/i)).toBeInTheDocument();
  });

  describe('Total execution time', () => {
    it('should display Total execution time when total_execution_time_ms is present', () => {
      renderTestComponent({
        migrationStats: {
          ...baseProps.migrationStats,
          last_execution: { total_execution_time_ms: 65000 },
        },
      });
      expect(screen.getByTestId('migrationExecutionTime')).toBeVisible();
      expect(screen.getByTestId('migrationExecutionTime')).toHaveTextContent(
        'Total execution time:'
      );
    });

    it('should not display Total execution time when total_execution_time_ms is not present', () => {
      renderTestComponent({
        migrationStats: {
          ...baseProps.migrationStats,
          last_execution: {},
        },
      });
      expect(screen.queryByTestId('migrationExecutionTime')).not.toBeInTheDocument();
    });
  });
});
