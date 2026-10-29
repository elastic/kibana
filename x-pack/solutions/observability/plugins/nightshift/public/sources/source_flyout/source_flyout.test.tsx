/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
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

  it('lets an unchanged query be saved without validating it again', async () => {
    renderFlyout({ source });
    await waitOutDebounce();

    expect(saveButton()).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
