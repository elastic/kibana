/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowMigrationResultPanel } from './migration_result_panel';
import type { WorkflowMigrationStats } from '../../types';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';

const getStats = (overrides: Partial<WorkflowMigrationStats> = {}): WorkflowMigrationStats => ({
  id: 'migration-1',
  name: 'My Tines migration',
  status: SiemMigrationTaskStatus.FINISHED,
  items: { total: 3, pending: 0, processing: 0, completed: 3, failed: 0 },
  created_at: '2024-06-01T12:00:00Z',
  last_updated_at: '2024-06-01T12:30:00Z',
  last_execution: { total_execution_time_ms: 60000 },
  ...overrides,
});

const renderPanel = (
  stats = getStats(),
  props: Partial<React.ComponentProps<typeof WorkflowMigrationResultPanel>> = {}
) =>
  render(<WorkflowMigrationResultPanel migrationStats={stats} {...props} />, {
    wrapper: TestProviders,
  });

describe('WorkflowMigrationResultPanel', () => {
  it('should show the migration name and the complete badge', () => {
    renderPanel();

    expect(screen.getByText('My Tines migration')).toBeInTheDocument();
    expect(screen.getByTestId('migrationCompleteBadge')).toHaveTextContent('Translation complete');
  });

  it('should show the total execution time', () => {
    renderPanel();

    expect(screen.getByTestId('migrationExecutionTime')).toBeInTheDocument();
  });

  it('should link to the translated workflows of the migration', () => {
    renderPanel();

    expect(screen.getByTestId('viewTranslatedWorkflowsButton')).toHaveTextContent(
      'Go to translated workflows'
    );
  });

  it('should show the last execution error when the migration had one', () => {
    renderPanel(getStats({ last_execution: { error: 'Something went wrong' } }));

    expect(screen.getByTestId('workflowMigrationLastError')).toHaveTextContent(
      'Something went wrong'
    );
  });

  it('should ask to toggle when the header is clicked', () => {
    const onToggleCollapsed = jest.fn();
    renderPanel(getStats(), { isCollapsed: true, onToggleCollapsed });

    fireEvent.click(screen.getByText('Translation complete'));

    expect(onToggleCollapsed).toHaveBeenCalled();
  });
});
