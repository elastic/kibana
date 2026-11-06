/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { RecommendedSource } from '@kbn/nightshift-sources-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  INITIAL_RECOMMENDED_SOURCES_CREATION_STATE,
  RecommendedSourcesTable,
  type RecommendedSourcesCreationState,
} from './recommended_sources_table';

const mockFetch = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn() };
const mockOnCreationStateChange = jest.fn();
let mockRecommendations: RecommendedSource[];

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: mockToasts },
      nightshiftSources: {
        getClient: jest.fn().mockResolvedValue({ fetch: mockFetch }),
      },
    },
  }),
}));
jest.mock('../../../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: false }),
}));
jest.mock('../../../../data/sources/use_recommended_sources', () => ({
  useRecommendedSources: () => ({
    data: mockRecommendations,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const RECOMMENDATIONS: RecommendedSource[] = [
  {
    id: 'logs',
    title: 'Logs',
    description: 'Application logs',
    tags: ['logs'],
    esql: 'FROM logs*',
  },
  {
    id: 'metrics',
    title: 'Metrics',
    description: 'Application metrics',
    tags: ['metrics'],
    esql: 'FROM metrics-*',
  },
];

const makeSource = (id: string): NightshiftSource => ({
  id,
  title: id,
  tags: [],
  esql: `FROM ${id}*`,
  type: id === 'metrics' ? 'metrics' : 'logs',
  slug: id,
  view_name: `$.nightshift.sources.default.${id}`,
  enabled: true,
  created_by: 'elastic',
  created_at: '2026-10-30T00:00:00.000Z',
  updated_at: '2026-10-30T00:00:00.000Z',
  esql_updated_at: '2026-10-30T00:00:00.000Z',
});

const TableHarness = ({ entry }: { entry: 'detections_page' | 'sources_page' }) => {
  const [creationState, setCreationState] = React.useState<RecommendedSourcesCreationState>(
    INITIAL_RECOMMENDED_SOURCES_CREATION_STATE
  );
  const onCreationStateChange = (state: RecommendedSourcesCreationState) => {
    mockOnCreationStateChange(state);
    setCreationState(state);
  };

  return (
    <RecommendedSourcesTable
      entry={entry}
      isDetectionEnabled={entry === 'detections_page' && creationState.hasCreatedSources}
      onCreationStateChange={onCreationStateChange}
    />
  );
};

const renderTable = (entry: 'detections_page' | 'sources_page' = 'detections_page') => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const renderRecommendedSourcesTable = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <EuiProvider>
          <TableHarness entry={entry} />
        </EuiProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(renderRecommendedSourcesTable());
  return { rerenderTable: () => view.rerender(renderRecommendedSourcesTable()) };
};

describe('RecommendedSourcesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecommendations = RECOMMENDATIONS;
  });

  it('disables detection when no draft is selected', async () => {
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-logs')).toBeChecked()
    );

    fireEvent.click(screen.getByTestId('checkboxSelectAll'));

    expect(screen.getByTestId('nightshiftRecommendedSourcesEnableButton')).toBeDisabled();
  });

  it('creates the selected drafts in table order', async () => {
    mockFetch
      .mockResolvedValueOnce({ source: makeSource('logs') })
      .mockResolvedValueOnce({ source: makeSource('metrics') });
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-logs')).toBeChecked()
    );

    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(mockFetch.mock.calls.map(([, options]) => options.params.body.title)).toEqual([
      'Logs',
      'Metrics',
    ]);
    expect(mockOnCreationStateChange).toHaveBeenLastCalledWith({
      isCreating: false,
      hasCreatedSources: true,
      hasFailedDrafts: false,
    });
  });

  it('uses source-specific action and success copy on the Sources page', async () => {
    mockRecommendations = [RECOMMENDATIONS[0]];
    mockFetch.mockResolvedValueOnce({ source: makeSource('logs') });
    const { rerenderTable } = renderTable('sources_page');

    const submitButton = screen.getByTestId('nightshiftRecommendedSourcesEnableButton');
    await waitFor(() => expect(submitButton).toBeEnabled());
    expect(screen.queryByTestId('checkboxSelectAll')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkboxSelectRow-recommended-logs')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftRecommendedSourcesCreateButton')
    ).not.toBeInTheDocument();
    expect(submitButton).toHaveTextContent('Add selected source');
    expect(submitButton).toHaveAttribute('data-ebt-action', 'addRecommendedSources');

    mockRecommendations = [];
    rerenderTable();
    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(
      screen.queryByText('You can edit this recommendation before adding it to this space.')
    ).not.toBeInTheDocument();

    mockRecommendations = [RECOMMENDATIONS[0]];
    rerenderTable();
    await waitFor(() => expect(submitButton).toBeEnabled());
    expect(
      screen.getByText('You can edit this recommendation before adding it to this space.')
    ).toBeInTheDocument();
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockToasts.addSuccess).toHaveBeenCalledWith({
        title: 'Added 1 source',
        text: undefined,
      })
    );
  });

  it('removes created drafts and keeps a failed draft selected', async () => {
    mockFetch
      .mockResolvedValueOnce({ source: makeSource('logs') })
      .mockRejectedValueOnce(new Error('Metrics failed'))
      .mockRejectedValueOnce(new Error('Metrics still failed'));
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked()
    );

    mockRecommendations = [];
    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));

    await waitFor(() =>
      expect(screen.queryByTestId('checkboxSelectRow-recommended-logs')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked();
    expect(screen.getByTestId('nightshiftRecommendedSourcesEnableButton')).toHaveTextContent(
      'Add selected sources'
    );
    expect(mockOnCreationStateChange).toHaveBeenNthCalledWith(1, {
      isCreating: true,
      hasCreatedSources: false,
      hasFailedDrafts: false,
    });
    expect(mockOnCreationStateChange).toHaveBeenLastCalledWith({
      isCreating: false,
      hasCreatedSources: true,
      hasFailedDrafts: true,
    });

    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked();
    expect(mockOnCreationStateChange).toHaveBeenLastCalledWith({
      isCreating: false,
      hasCreatedSources: true,
      hasFailedDrafts: true,
    });
    expect(mockToasts.addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Metrics failed' }),
      { title: 'Could not create source "Metrics"' }
    );
  });

  it('retains an unsubmitted failed draft after another failed draft succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Logs failed'))
      .mockRejectedValueOnce(new Error('Metrics failed'))
      .mockResolvedValueOnce({ source: makeSource('logs') });
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked()
    );

    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByTestId('checkboxSelectRow-recommended-metrics'));
    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    expect(screen.queryByTestId('checkboxSelectRow-recommended-logs')).not.toBeInTheDocument();
    expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).not.toBeChecked();
    expect(mockOnCreationStateChange).toHaveBeenLastCalledWith({
      isCreating: false,
      hasCreatedSources: true,
      hasFailedDrafts: true,
    });
  });
});
