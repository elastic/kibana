/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { NightshiftSource, ValidateSourceQueryResponse } from '@kbn/nightshift-shared';
import { SourceFlyout } from './source_flyout';

const mockFetch = jest.fn<Promise<ValidateSourceQueryResponse>, [string, unknown]>();
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
  useSourcesApi: () => ({ updateSource: { mutateAsync: mockUpdateSource, isLoading: false } }),
}));
jest.mock('./source_preview', () => ({ SourcePreview: () => null }));
jest.mock('@kbn/esql/public', () => ({ ESQLLangEditor: () => null }));

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

describe('SourceFlyout query validation', () => {
  it('lets an unchanged query be saved without validating it again', async () => {
    mockFetch.mockResolvedValue({ valid: false, error: 'Unknown index [logs-gone]' });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SourceFlyout source={source} onClose={jest.fn()} />
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByTestId('significantEventsAppSourceFlyoutTitleInput'), {
      target: { value: 'Renamed' },
    });
    fireEvent.click(screen.getByTestId('significantEventsAppSourceFlyoutSaveButton'));

    await waitFor(() =>
      expect(mockUpdateSource).toHaveBeenCalledWith({
        sourceId: source.id,
        body: { title: 'Renamed', tags: [], esql: source.esql },
      })
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
