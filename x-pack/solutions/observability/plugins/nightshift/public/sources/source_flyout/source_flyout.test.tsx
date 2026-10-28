/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { NightshiftSource, ValidateSourceQueryResponse } from '@kbn/nightshift-shared';
import { SourceFlyout } from './source_flyout';
import { SOURCE_QUERY_VALIDATION_DEBOUNCE_MS } from './use_source_query_validation';

const mockFetch = jest.fn<Promise<ValidateSourceQueryResponse>, [string, unknown]>();
const mockCreateSource = jest.fn();
const mockUpdateSource = jest.fn();

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: { toasts: { addError: jest.fn() } },
      nightshiftSources: { getClient: async () => ({ fetch: mockFetch }) },
    },
  }),
}));
jest.mock('../../data/sources/use_sources_api', () => ({
  useSourcesApi: () => ({
    createSource: { mutateAsync: mockCreateSource },
    updateSource: { mutateAsync: mockUpdateSource, isLoading: false },
  }),
}));
jest.mock('./source_preview', () => ({ SourcePreview: () => null }));
jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
    warning,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
    warning?: string;
  }) => (
    <>
      <textarea
        aria-label="Query editor"
        value={query.esql}
        onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
      />
      {warning}
    </>
  ),
}));

const source: NightshiftSource = {
  id: 'source-1',
  title: 'Gone',
  tags: [],
  esql: 'FROM logs-gone',
  type: 'logs',
  slug: 'gone',
  view_name: '$.nightshift.sources.default.gone',
  enabled: true,
  created_by: 'Elastic',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const renderFlyout = (props: { source?: NightshiftSource } = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SourceFlyout {...props} onClose={jest.fn()} />
    </QueryClientProvider>
  );

const typeQuery = (esql: string) =>
  fireEvent.change(screen.getByLabelText('Query editor'), { target: { value: esql } });

const waitOutDebounce = () =>
  act(async () => {
    jest.advanceTimersByTime(SOURCE_QUERY_VALIDATION_DEBOUNCE_MS);
  });

const saveButton = () => screen.getByTestId('significantEventsAppSourceFlyoutSaveButton');

describe('SourceFlyout query validation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps Create source disabled until the server accepts the query, and shows why inline', async () => {
    renderFlyout();
    expect(saveButton()).toBeDisabled();

    typeQuery('FROM logs-* | STATS c = COUNT(*)');
    expect(screen.getByTestId('significantEventsAppSourceFlyoutQueryValidating')).toBeVisible();
    await waitOutDebounce();
    expect(await screen.findByText(/Command "STATS" is not allowed/)).toBeVisible();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();

    mockFetch.mockResolvedValueOnce({
      valid: false,
      error: 'Unknown column [status]',
    });
    typeQuery('FROM logs-nginx | WHERE status >= 500');
    await waitOutDebounce();
    expect(await screen.findByText(/Unknown column \[status\]/)).toBeVisible();
    expect(mockFetch).toHaveBeenCalledWith('POST /internal/nightshift/sources/_validate', {
      params: { body: { esql: 'FROM logs-nginx | WHERE status >= 500' } },
      signal: expect.anything(),
    });
    expect(saveButton()).toBeDisabled();

    mockFetch.mockResolvedValueOnce({ valid: true, type: 'logs', index_exists: true });
    typeQuery('FROM logs-nginx');
    expect(saveButton()).toBeDisabled();
    await waitOutDebounce();
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(screen.queryByText(/Unknown column/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No index matches this query yet/)).not.toBeInTheDocument();

    mockFetch.mockResolvedValueOnce({ valid: true, type: 'logs', index_exists: false });
    typeQuery('FROM logs-new-*');
    await waitOutDebounce();
    expect(await screen.findByText(/No index matches this query yet/)).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  it('lets an unchanged query be saved without validating it again', async () => {
    renderFlyout({ source });
    await waitOutDebounce();

    expect(saveButton()).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('SourceFlyout enabled switch', () => {
  const enabledSwitch = () => screen.getByTestId('significantEventsAppSourceFlyoutEnabledSwitch');

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockCreateSource.mockReset();
    mockUpdateSource.mockReset();
    mockFetch.mockResolvedValue({ valid: true, type: 'logs', index_exists: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const fillNewSource = async () => {
    fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutTitleInput'), {
      target: { value: 'Nginx' },
    });
    typeQuery('FROM logs-nginx');
    await waitOutDebounce();
    await waitFor(() => expect(saveButton()).toBeEnabled());
  };

  it('is on by default, says what the source is enabled for and creates an enabled source', async () => {
    renderFlyout();
    expect(screen.getByText('Enabled')).toBeVisible();
    expect(enabledSwitch()).toBeChecked();
    expect(screen.getByText(/Onboarding starts as soon as the source is created/)).toBeVisible();

    await fillNewSource();
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockCreateSource).toHaveBeenCalledWith({
        title: 'Nginx',
        description: undefined,
        tags: [],
        esql: 'FROM logs-nginx',
        enabled: true,
      })
    );
  });

  it('creates a disabled source when switched off, and says nothing runs on it', async () => {
    renderFlyout();
    await fillNewSource();
    fireEvent.click(enabledSwitch());

    expect(enabledSwitch()).not.toBeChecked();
    expect(screen.getByText(/nothing runs on it/)).toBeVisible();
    expect(screen.queryByText(/Onboarding starts as soon as/)).not.toBeInTheDocument();

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockCreateSource).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    );
  });

  it.each([true, false])(
    'is not offered for an existing source, and saving it sends no enabled state (enabled: %s)',
    async (enabled) => {
      renderFlyout({ source: { ...source, enabled } });
      expect(screen.queryByTestId('significantEventsAppSourceFlyoutEnabledSwitch')).toBeNull();

      fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutTitleInput'), {
        target: { value: 'Renamed' },
      });
      await waitOutDebounce();
      fireEvent.click(saveButton());

      await waitFor(() => expect(mockUpdateSource).toHaveBeenCalledTimes(1));
      expect(mockUpdateSource.mock.calls[0][0].body).not.toHaveProperty('enabled');
    }
  );
});
