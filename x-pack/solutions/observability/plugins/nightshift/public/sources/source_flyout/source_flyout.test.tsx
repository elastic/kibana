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
let mockIsPaused = false;
jest.mock('../../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ isBlocked: mockIsPaused }),
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

const renderFlyout = (props: { source?: NightshiftSource; readOnly?: boolean } = {}) =>
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

describe('SourceFlyout onboard immediately', () => {
  const ONBOARD_LABEL = 'Onboard source immediately';
  // Generated ids are constant in Jest, so the label cannot be resolved through its `for` id.
  const checkbox = () =>
    screen.getByTestId('significantEventsAppSourceFlyoutOnboardImmediatelyCheckbox');
  const queryCheckbox = () =>
    screen.queryByTestId('significantEventsAppSourceFlyoutOnboardImmediatelyCheckbox');

  beforeEach(() => {
    jest.useFakeTimers();
    mockFetch.mockReset();
    mockCreateSource.mockReset();
    mockUpdateSource.mockReset();
    mockIsPaused = false;
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

  it('is on by default and creates the source with onboarding requested', async () => {
    renderFlyout();
    expect(checkbox()).toBeChecked();
    expect(screen.getByText(ONBOARD_LABEL)).toBeVisible();
    expect(screen.getByText('Starts onboarding as soon as you save the source.')).toBeVisible();

    await fillNewSource();
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockCreateSource).toHaveBeenCalledWith({
        title: 'Nginx',
        description: undefined,
        tags: [],
        esql: 'FROM logs-nginx',
        onboard_immediately: true,
      })
    );
  });

  it('creates the source without onboarding when the user clears it', async () => {
    renderFlyout();
    await fillNewSource();
    fireEvent.click(checkbox());
    expect(checkbox()).not.toBeChecked();
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mockCreateSource).toHaveBeenCalledWith(
        expect.objectContaining({ onboard_immediately: false })
      )
    );
  });

  it('is only offered on an edit once the query changed, and starts on', () => {
    renderFlyout({ source });
    expect(queryCheckbox()).not.toBeInTheDocument();

    typeQuery('FROM logs-other');
    expect(checkbox()).toBeChecked();
  });

  it('saves a changed query without onboarding when the user clears it', async () => {
    renderFlyout({ source });
    typeQuery('FROM logs-other');
    await waitOutDebounce();
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(checkbox());
    fireEvent.click(saveButton());
    fireEvent.click(await screen.findByText('Save and reset knowledge'));

    await waitFor(() =>
      expect(mockUpdateSource).toHaveBeenCalledWith({
        sourceId: source.id,
        body: expect.objectContaining({ esql: 'FROM logs-other', onboard_immediately: false }),
      })
    );
  });

  it('is hidden for a disabled source, which no save onboards', () => {
    renderFlyout({ source: { ...source, enabled: false } });
    typeQuery('FROM logs-other');

    expect(queryCheckbox()).not.toBeInTheDocument();
  });

  it('is hidden in a paused space, which starts no run', () => {
    mockIsPaused = true;
    renderFlyout();

    expect(queryCheckbox()).not.toBeInTheDocument();
  });

  it('is hidden when the flyout is read only', () => {
    renderFlyout({ source, readOnly: true });
    expect(queryCheckbox()).not.toBeInTheDocument();
  });
});
