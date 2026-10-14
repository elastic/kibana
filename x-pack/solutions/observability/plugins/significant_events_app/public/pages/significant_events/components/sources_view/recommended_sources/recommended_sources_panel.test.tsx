/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useKibana } from '../../../../../hooks/use_kibana';
import { ALL_LOGS_RECOMMENDED_SOURCE } from './recommended_sources';
import { RecommendedSourcesPanel } from './recommended_sources_panel';

jest.mock('../../../../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const ADD_BUTTON = 'significantEventsAppRecommendedSourceAddButton';

const toSource = (overrides: Partial<NightshiftSource>): NightshiftSource => ({
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  type: 'logs',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const setup = (sources: NightshiftSource[], fetch: jest.Mock) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  mockUseKibana.mockReturnValue({
    core: { notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } } },
    dependencies: {
      start: { nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) } },
    },
  } as never);
  const renderPanel = (current: NightshiftSource[]) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <RecommendedSourcesPanel sources={current} />
      </QueryClientProvider>
    </I18nProvider>
  );
  const view = render(renderPanel(sources));
  return { ...view, rerenderWith: (next: NightshiftSource[]) => view.rerender(renderPanel(next)) };
};

describe('RecommendedSourcesPanel', () => {
  it('recommends All logs without creating anything on render', () => {
    const fetch = jest.fn();
    setup([], fetch);

    expect(screen.getByText(ALL_LOGS_RECOMMENDED_SOURCE.title)).toBeInTheDocument();
    expect(screen.getByText('FROM logs*')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates the preset on click through the source create route', async () => {
    const fetch = jest.fn().mockResolvedValue({ source: toSource({ esql: 'FROM logs*' }) });
    setup([], fetch);

    fireEvent.click(screen.getByTestId(ADD_BUTTON));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith('POST /internal/nightshift/sources', {
      params: {
        body: {
          title: ALL_LOGS_RECOMMENDED_SOURCE.title,
          description: ALL_LOGS_RECOMMENDED_SOURCE.description,
          tags: [...ALL_LOGS_RECOMMENDED_SOURCE.tags],
          esql: 'FROM logs*',
        },
      },
      signal: null,
    });
  });

  it('ignores a double click while the create is in flight', async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    const fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    setup([], fetch);

    const button = screen.getByTestId(ADD_BUTTON);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    resolveCreate({ source: toSource({ esql: 'FROM logs*' }) });
    await waitFor(() => expect(button).toBeEnabled());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shows the error inline and lets the user retry', async () => {
    const fetch = jest
      .fn()
      .mockRejectedValueOnce({ body: { message: 'Unknown index [logs*]' } })
      .mockResolvedValueOnce({ source: toSource({ esql: 'FROM logs*' }) });
    setup([], fetch);

    fireEvent.click(screen.getByTestId(ADD_BUTTON));

    expect(
      await screen.findByTestId('significantEventsAppRecommendedSourceError')
    ).toHaveTextContent('Unknown index [logs*]');

    fireEvent.click(screen.getByTestId(ADD_BUTTON));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('hides while a source with the same query exists and comes back after it is deleted', () => {
    const { rerenderWith } = setup([toSource({ esql: '  FROM   logs*  ' })], jest.fn());

    expect(screen.queryByTestId('significantEventsAppRecommendedSources')).not.toBeInTheDocument();

    rerenderWith([toSource({})]);

    expect(screen.getByTestId('significantEventsAppRecommendedSources')).toBeInTheDocument();
  });
});
