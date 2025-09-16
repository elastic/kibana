/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardMigrationResultPanel } from './migration_result_panel';
import { TestProviders } from '../../../../common/mock';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import type { MigrationTaskStats } from '../../../../../common/siem_migrations/model/common.gen';

jest.mock('../../../../common/lib/kibana/use_kibana');

// Only mock the hook that makes a network request
jest.mock('../../logic/use_get_migration_translation_stats', () => ({
  useGetMigrationTranslationStats: jest.fn(() => ({
    data: {
      dashboards: {
        success: { result: { full: 1, partial: 2, untranslatable: 3 } },
        failed: 4,
      },
    },
    isLoading: false,
  })),
}));

const baseProps = {
  migrationStats: {
    id: '1',
    created_at: '2023-01-01T00:00:00Z',
    last_updated_at: '2024-01-01T01:00:00Z',
    last_execution: {},
  },
  isCollapsed: false,
  onToggleCollapsed: jest.fn(),
};

const renderTestComponent = (
  props: Partial<React.ComponentProps<typeof DashboardMigrationResultPanel>> = {}
) => {
  return render(<DashboardMigrationResultPanel {...baseProps} {...props} />, {
    wrapper: TestProviders,
  });
};

describe('DashboardMigrationResultPanel', () => {
  it('renders panel with title, badge, and button', () => {
    renderTestComponent();
    expect(screen.getByTestId('migrationPanelTitle')).toBeInTheDocument();
    const badge = screen.getByTestId('migrationCompleteBadge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Translation complete');
    const button = screen.getByTestId('collapseButton');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Collapse dashboard migration');
    expect(screen.getByTestId('migrationPanelDescription')).toHaveTextContent(
      /Export uploaded on December 31st 2022, 7:00:00 pm and translation finished 2 years ago./
    );
  });

  it('calls onToggleCollapsed when button is clicked', () => {
    renderTestComponent();
    fireEvent.click(screen.getByTestId('collapseButton'));
    expect(baseProps.onToggleCollapsed).toHaveBeenCalled();
  });

  it('renders error if last_execution.error is present', () => {
    renderTestComponent({
      migrationStats: {
        ...baseProps.migrationStats,
        last_execution: { error: 'Something went wrong' },
      } as unknown as MigrationTaskStats,
    });
    expect(screen.getByTestId(/dashboardMigrationLastError/)).toBeVisible();
  });

  it('renders loading spinner if translation stats are loading', () => {
    (useGetMigrationTranslationStats as jest.Mock).mockImplementationOnce(() => ({
      data: undefined,
      isLoading: true,
    }));
    renderTestComponent();
    expect(screen.getByTestId('centeredLoadingSpinner')).toBeInTheDocument();
  });

  it('renders  table when translation stats are loaded', () => {
    renderTestComponent();
    expect(screen.getByTestId('translatedResultsTable')).toBeInTheDocument();
  });

  it('renders upload missing panel', () => {
    renderTestComponent();
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });
});
