/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { WorkflowMigrationWorkflow } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { TestProviders } from '../../../../common/mock';
import * as api from '../../api';
import type { WorkflowMigrationStats } from '../../types';
import { MigrationWorkflowsTable } from '.';

jest.mock('../../api');

const mockedApi = api as jest.Mocked<typeof api>;

const migrationStats = {
  id: 'migration-1',
  name: 'My Tines migration',
  status: SiemMigrationTaskStatus.FINISHED,
  items: { total: 3, pending: 0, processing: 0, completed: 3, failed: 0 },
  created_at: '2024-06-01T12:00:00Z',
  last_updated_at: '2024-06-01T12:30:00Z',
} as WorkflowMigrationStats;

const getWorkflow = (overrides: Partial<WorkflowMigrationWorkflow> = {}) =>
  ({
    id: 'item-1',
    '@timestamp': '2024-06-01T12:00:00Z',
    migration_id: 'migration-1',
    created_by: 'user1',
    original_workflow: {
      id: 'story-1',
      vendor: 'tines',
      title: 'Phishing triage',
      description: 'Triages reported phishing emails',
      data: '{}',
      format: 'json',
    },
    status: 'completed',
    translation_result: 'full',
    updated_at: '2024-06-01T12:30:00Z',
    ...overrides,
  } as WorkflowMigrationWorkflow);

const mockTranslationStats = (total: number) =>
  mockedApi.getWorkflowMigrationTranslationStats.mockResolvedValue(
    total === 0
      ? undefined
      : ({
          id: 'migration-1',
          items: { total },
        } as unknown as Awaited<ReturnType<typeof api.getWorkflowMigrationTranslationStats>>)
  );

const mockWorkflows = (workflows: WorkflowMigrationWorkflow[], total = workflows.length) =>
  mockedApi.getWorkflowMigrationWorkflows.mockResolvedValue({ data: workflows, total });

const renderTable = () =>
  render(<MigrationWorkflowsTable migrationStats={migrationStats} />, { wrapper: TestProviders });

const lastWorkflowsRequest = () =>
  mockedApi.getWorkflowMigrationWorkflows.mock.calls[
    mockedApi.getWorkflowMigrationWorkflows.mock.calls.length - 1
  ][0];

describe('MigrationWorkflowsTable', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockTranslationStats(3);
    mockWorkflows([
      getWorkflow(),
      getWorkflow({
        id: 'item-2',
        original_workflow: {
          id: 'story-2',
          vendor: 'tines',
          title: 'Enrich IOCs',
          data: '{}',
          format: 'json',
        },
        translation_result: 'partial',
      }),
      getWorkflow({
        id: 'item-3',
        original_workflow: {
          id: 'story-3',
          vendor: 'tines',
          title: 'Broken story',
          data: '{}',
          format: 'json',
        },
        status: 'failed',
        translation_result: undefined,
      }),
    ]);
  });

  it('should show the name and the description of each workflow', async () => {
    renderTable();

    expect(await screen.findByText('Phishing triage')).toBeInTheDocument();
    expect(screen.getByText('Triages reported phishing emails')).toBeInTheDocument();
  });

  it.each([
    ['translationStatus-full', 'Translated'],
    ['translationStatus-partial', 'Partially translated'],
    ['translationStatus-failed', 'Error'],
  ])('should show the %s status as "%s"', async (testId, text) => {
    renderTable();

    expect(await screen.findByTestId(testId)).toHaveTextContent(text);
  });

  it('should show untranslatable workflows as not translated', async () => {
    mockWorkflows([getWorkflow({ translation_result: 'untranslatable' })]);
    renderTable();

    expect(await screen.findByTestId('translationStatus-untranslatable')).toHaveTextContent(
      'Not translated'
    );
  });

  it('should show a disabled details action for each workflow', async () => {
    renderTable();

    const buttons = await screen.findAllByTestId('workflowDetailsButton');

    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it('should not offer to select workflows', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('should show the empty state when the migration has no workflows', async () => {
    mockTranslationStats(0);
    mockWorkflows([]);
    renderTable();

    await waitFor(() => expect(screen.queryByTestId('siemMigrationsWorkflowsTable')).toBeNull());
    expect(screen.queryByText('Phishing triage')).not.toBeInTheDocument();
  });

  it('should search the workflows by the entered term', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    fireEvent.change(screen.getByTestId('searchField'), { target: { value: ' phishing ' } });
    fireEvent.keyDown(screen.getByTestId('searchField'), { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(lastWorkflowsRequest().filters).toMatchObject({ searchTerm: 'phishing' })
    );
  });

  it('should request the first page sorted by the translation result by default', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    expect(lastWorkflowsRequest()).toMatchObject({
      page: 0,
      perPage: 10,
      sortField: 'translation_result',
      sortDirection: 'desc',
    });
  });

  it('should sort by the name when the name header is clicked', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    fireEvent.click(within(screen.getByTestId('workflows-translation-table')).getByText('Name'));

    await waitFor(() =>
      expect(lastWorkflowsRequest()).toMatchObject({ sortField: 'original_workflow.title' })
    );
  });

  it('should sort by the server "updated" field when "Translated on" is clicked', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    fireEvent.click(
      within(screen.getByTestId('workflows-translation-table')).getByText('Translated on')
    );

    await waitFor(() => expect(lastWorkflowsRequest()).toMatchObject({ sortField: 'updated' }));
  });

  it('should show how many workflows match', async () => {
    mockWorkflows([getWorkflow()], 25);
    renderTable();

    expect(await screen.findByTestId('workflowsTableSummary')).toHaveTextContent(
      'Showing 1 - 10 of 25 workflows'
    );
  });
});
