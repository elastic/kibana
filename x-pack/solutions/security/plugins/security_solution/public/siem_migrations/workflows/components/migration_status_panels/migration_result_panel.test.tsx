/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkflowMigrationResultPanel } from './migration_result_panel';
import type { WorkflowMigrationStats } from '../../types';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import * as api from '../../api';

jest.mock('../../api');

const mockedApi = api as jest.Mocked<typeof api>;

const mockTranslationStats = (
  stats: Awaited<ReturnType<typeof api.getWorkflowMigrationTranslationStats>>
) => mockedApi.getWorkflowMigrationTranslationStats.mockResolvedValue(stats);

const translationStats = {
  id: 'migration-1',
  items: {
    total: 10,
    success: { total: 6, result: { full: 1, partial: 2, untranslatable: 3 }, installable: 3 },
    failed: 4,
  },
} as Awaited<ReturnType<typeof api.getWorkflowMigrationTranslationStats>>;

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
  beforeEach(() => {
    jest.resetAllMocks();
    mockTranslationStats(translationStats);
  });

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

    fireEvent.click(screen.getByText('My Tines migration'));

    expect(onToggleCollapsed).toHaveBeenCalledWith(false);
  });

  describe('translation summary', () => {
    it.each([
      ['Translated', '1'],
      ['Partially translated', '2'],
      ['Not translated', '3'],
      ['Failed', '4'],
    ])('should count the workflows that are "%s"', async (status, count) => {
      renderPanel();

      expect(await screen.findByTestId(`translationStatusCount-${status}`)).toHaveTextContent(
        count
      );
    });

    it('should not show the summary when the migration has no translation stats yet', async () => {
      mockTranslationStats(undefined);
      renderPanel();

      await waitFor(() =>
        expect(mockedApi.getWorkflowMigrationTranslationStats).toHaveBeenCalled()
      );
      expect(screen.queryByTestId('translationResultsChart')).not.toBeInTheDocument();
    });

    it('should keep the link to the translated workflows when there are no translation stats', async () => {
      mockTranslationStats(undefined);
      renderPanel();

      expect(await screen.findByTestId('viewTranslatedWorkflowsButton')).toBeInTheDocument();
    });
  });

  it('should collapse and expand with the chevron button', () => {
    const onToggleCollapsed = jest.fn();
    renderPanel(getStats(), { isCollapsed: false, onToggleCollapsed });

    fireEvent.click(screen.getByTestId('collapseButton'));

    expect(onToggleCollapsed).toHaveBeenCalledWith(true);
  });
});
