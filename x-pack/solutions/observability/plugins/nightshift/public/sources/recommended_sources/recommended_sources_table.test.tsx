/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import type { NightshiftSource, RecommendedSource } from '@kbn/nightshift-shared';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { RecommendedSourcesTable } from './recommended_sources_table';

const mockFetch = jest.fn();
const mockToasts = { addSuccess: jest.fn(), addError: jest.fn() };
let mockRecommendations: RecommendedSource[];

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: mockToasts },
      nightshiftSources: {
        getClient: jest.fn().mockResolvedValue({ fetch: mockFetch }),
      },
    },
  }),
}));
jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: false }),
}));
jest.mock('../../data/sources/use_recommended_sources', () => ({
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

const renderTable = (entry: 'detections_page' | 'sources_page' = 'detections_page') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nProvider>
        <EuiProvider>
          <RecommendedSourcesTable entry={entry} />
        </EuiProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

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
  });

  it('uses source-specific action and success copy on the Sources page', async () => {
    mockFetch
      .mockResolvedValueOnce({ source: makeSource('logs') })
      .mockResolvedValueOnce({ source: makeSource('metrics') });
    renderTable('sources_page');
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-logs')).toBeChecked()
    );

    const submitButton = screen.getByTestId('nightshiftRecommendedSourcesEnableButton');
    expect(submitButton).toHaveTextContent('Add selected sources');
    expect(submitButton).toHaveAttribute('data-ebt-action', 'addRecommendedSources');
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(mockToasts.addSuccess).toHaveBeenCalledWith({
        title: 'Added 2 sources',
        text: undefined,
      })
    );
  });

  it('removes created drafts and keeps a failed draft selected', async () => {
    mockFetch
      .mockResolvedValueOnce({ source: makeSource('logs') })
      .mockRejectedValueOnce(new Error('Metrics failed'));
    renderTable();
    await waitFor(() =>
      expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked()
    );

    fireEvent.click(screen.getByTestId('nightshiftRecommendedSourcesEnableButton'));

    await waitFor(() =>
      expect(screen.queryByTestId('checkboxSelectRow-recommended-logs')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('checkboxSelectRow-recommended-metrics')).toBeChecked();
    expect(mockToasts.addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Metrics failed' }),
      { title: 'Could not create source "Metrics"' }
    );
  });
});
