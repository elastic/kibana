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

  describe('actions', () => {
    const getRow = async (title: string) =>
      (await screen.findByText(title)).closest('tr') as HTMLElement;

    it('should offer to install a translated workflow that is not installed yet', async () => {
      renderTable();

      const row = within(await getRow('Phishing triage'));

      expect(row.getByTestId('installWorkflowButton')).toBeInTheDocument();
      expect(row.queryByTestId('viewWorkflowButton')).not.toBeInTheDocument();
    });

    it('should offer to install a partially translated workflow', async () => {
      renderTable();

      const row = within(await getRow('Enrich IOCs'));

      expect(row.getByTestId('installWorkflowButton')).toBeInTheDocument();
    });

    it('should offer to view, and not to install, a workflow that is installed', async () => {
      mockWorkflows([
        getWorkflow({
          elastic_workflow: { id: 'elastic-workflow-1', title: 'Phishing triage elastic' },
        }),
      ]);
      renderTable();

      const row = within(await getRow('Phishing triage elastic'));

      expect(row.getByTestId('viewWorkflowButton')).toBeInTheDocument();
      expect(row.queryByTestId('installWorkflowButton')).not.toBeInTheDocument();
    });

    it('should not offer any action for a workflow that failed', async () => {
      renderTable();

      const row = within(await getRow('Broken story'));

      expect(row.queryByTestId('installWorkflowButton')).not.toBeInTheDocument();
      expect(row.queryByTestId('viewWorkflowButton')).not.toBeInTheDocument();
    });

    it('should not offer any action for an untranslatable workflow', async () => {
      mockWorkflows([getWorkflow({ translation_result: 'untranslatable' })]);
      renderTable();

      const row = within(await getRow('Phishing triage'));

      expect(row.queryByTestId('installWorkflowButton')).not.toBeInTheDocument();
      expect(row.queryByTestId('viewWorkflowButton')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    const getRow = async (title: string) =>
      within((await screen.findByText(title)).closest('tr') as HTMLElement);

    it('should let the user select a translated workflow that is not installed', async () => {
      renderTable();

      expect((await getRow('Phishing triage')).getByRole('checkbox')).toBeEnabled();
    });

    it('should let the user select a partially translated workflow', async () => {
      renderTable();

      expect((await getRow('Enrich IOCs')).getByRole('checkbox')).toBeEnabled();
    });

    it('should not let the user select a workflow that failed', async () => {
      renderTable();

      expect((await getRow('Broken story')).getByRole('checkbox')).toBeDisabled();
    });

    it('should not let the user select an untranslatable workflow', async () => {
      mockWorkflows([getWorkflow({ translation_result: 'untranslatable' })]);
      renderTable();

      expect((await getRow('Phishing triage')).getByRole('checkbox')).toBeDisabled();
    });

    it('should not let the user select a workflow that is installed', async () => {
      mockWorkflows([
        getWorkflow({
          elastic_workflow: { id: 'elastic-workflow-1', title: 'Phishing triage elastic' },
        }),
      ]);
      renderTable();

      expect((await getRow('Phishing triage elastic')).getByRole('checkbox')).toBeDisabled();
    });

    it('should show how many workflows are selected', async () => {
      renderTable();

      fireEvent.click((await getRow('Phishing triage')).getByRole('checkbox'));

      expect(screen.getByTestId('workflowsTableSummary')).toHaveTextContent('Selected 1 workflow');
    });
  });

  it('should label the last column "Actions"', async () => {
    renderTable();
    await screen.findByText('Phishing triage');

    const header = screen.getByRole('columnheader', { name: /Actions/ });
    expect(header.querySelector('.euiScreenReaderOnly')).toBeNull();
  });

  describe('details flyout', () => {
    it('should open the details of a workflow when its name is clicked', async () => {
      renderTable();

      fireEvent.click((await screen.findAllByTestId('workflowName'))[0]);

      expect(await screen.findByTestId('workflowDetailsFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Phishing triage');
    });

    it('should show the Translation and Summary tabs in the details', async () => {
      renderTable();

      fireEvent.click((await screen.findAllByTestId('workflowName'))[0]);

      expect(await screen.findByTestId('tabTranslation')).toBeInTheDocument();
      expect(screen.getByTestId('tabSummary')).toBeInTheDocument();
    });

    it('should not open any details for a workflow that failed', async () => {
      renderTable();
      const failedName = within(
        (await screen.findByText('Broken story')).closest('tr') as HTMLElement
      ).getByTestId('workflowName');

      fireEvent.click(failedName);

      expect(screen.queryByTestId('workflowDetailsFlyout')).not.toBeInTheDocument();
    });

    it('should close the details when the close button is clicked', async () => {
      renderTable();
      fireEvent.click((await screen.findAllByTestId('workflowName'))[0]);

      fireEvent.click(await screen.findByTestId('detailsFlyoutCloseButton'));

      await waitFor(() =>
        expect(screen.queryByTestId('workflowDetailsFlyout')).not.toBeInTheDocument()
      );
    });
  });

  describe('details flyout navigation', () => {
    const openFirstWorkflow = async () =>
      fireEvent.click((await screen.findAllByTestId('workflowName'))[0]);

    it('should go to the next workflow with the next button', async () => {
      renderTable();
      await openFirstWorkflow();

      fireEvent.click(await screen.findByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Enrich IOCs');
    });

    it('should go back to the previous workflow with the previous button', async () => {
      renderTable();
      await openFirstWorkflow();
      fireEvent.click(await screen.findByTestId('flyoutPrevNextNavNextButton'));

      fireEvent.click(screen.getByTestId('flyoutPrevNextNavPreviousButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Phishing triage');
    });

    it('should not offer a previous workflow on the first one', async () => {
      renderTable();
      await openFirstWorkflow();

      expect(await screen.findByTestId('flyoutPrevNextNavPreviousButton')).toBeDisabled();
    });

    it('should skip the workflows that failed', async () => {
      mockWorkflows([
        getWorkflow(),
        getWorkflow({
          id: 'item-failed',
          original_workflow: {
            id: 'story-failed',
            vendor: 'tines',
            title: 'Broken story',
            data: '{}',
            format: 'json',
          },
          status: 'failed',
          translation_result: undefined,
        }),
        getWorkflow({
          id: 'item-3',
          original_workflow: {
            id: 'story-3',
            vendor: 'tines',
            title: 'Enrich IOCs',
            data: '{}',
            format: 'json',
          },
        }),
      ]);
      renderTable();
      await openFirstWorkflow();

      fireEvent.click(await screen.findByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('detailsFlyoutTitle')).toHaveTextContent('Enrich IOCs');
    });

    it('should not offer a next workflow on the last one that did not fail', async () => {
      renderTable();
      await openFirstWorkflow();
      fireEvent.click(await screen.findByTestId('flyoutPrevNextNavNextButton'));

      expect(screen.getByTestId('flyoutPrevNextNavNextButton')).toBeDisabled();
    });
  });

  describe('tooltips', () => {
    it('should show the full description when hovering the description', async () => {
      renderTable();

      fireEvent.mouseOver(await screen.findByTestId('workflowDescription'));

      expect(await screen.findByRole('tooltip')).toHaveTextContent(
        'Triages reported phishing emails'
      );
    });

    it('should show the full name when hovering the name', async () => {
      renderTable();

      fireEvent.mouseOver((await screen.findAllByTestId('workflowName'))[0]);

      expect(await screen.findByRole('tooltip')).toHaveTextContent('Phishing triage');
    });
  });

  it('should truncate a long description with an ellipsis', async () => {
    renderTable();

    expect(await screen.findByTestId('workflowDescription')).toHaveClass('eui-textTruncate');
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
