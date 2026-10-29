/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { I18nProvider } from '@kbn/i18n-react';
import { SourcesView } from './sources_view';

const createSource = (id: string): NightshiftSource => ({
  id,
  title: `Source ${id}`,
  tags: [],
  esql: 'FROM logs-*',
  type: 'logs',
  slug: id,
  view_name: `$.nightshift.sources.default.${id}`,
  enabled: true,
  created_by: 'Elastic',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
});

let mockSources: NightshiftSource[];
let mockCanManage = true;
let mockIsSourcesLoading = false;
let mockIsSourcesError = false;
const mockToasts = { addWarning: jest.fn() };

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { capabilities: { nightshift: { show: true, manage: mockCanManage } } },
      notifications: { toasts: mockToasts },
    },
  }),
}));
jest.mock('./onboarding/ki_generation_context', () => ({
  useKiGeneration: () => ({
    sources: mockSources,
    isSourcesLoading: mockIsSourcesLoading,
    isSourcesFetching: false,
    isSourcesError: mockIsSourcesError,
    refetchSources: jest.fn(),
    isScheduling: false,
    onboardingConfig: { steps: [], connectors: {} },
    setOnboardingConfig: jest.fn(),
    featuresConnectors: { loading: false },
    queriesConnectors: { loading: false },
    generatingSourceIds: [],
    sourceStatusMap: {},
    cancelOnboarding: jest.fn(),
    bulkScheduleOnboarding: jest.fn(),
    bulkOnboardAll: jest.fn(),
    bulkOnboardFeaturesOnly: jest.fn(),
    bulkOnboardQueriesOnly: jest.fn(),
  }),
}));
jest.mock('../data/connectors/use_ai_features', () => ({ useAIFeatures: () => null }));
jest.mock('../data/sources/use_sources_api', () => ({
  useSourcesApi: () => ({
    setSourceEnabled: { isLoading: false, mutate: jest.fn() },
    deleteSource: { isLoading: false, mutate: jest.fn() },
  }),
}));
jest.mock('../data/discovery/significant_events_page_context', () => ({
  useSignificantEventsPageContext: () => ({
    isRunning: false,
    isCanceling: false,
    handleRun: jest.fn(),
    handleCancel: jest.fn(),
  }),
}));
jest.mock('../data/maintenance/use_significant_events_maintenance', () => ({
  useBlocksNewActivity: () => ({ blocksActivity: false }),
}));
jest.mock('../components/search_bar', () => ({ SignificantEventsSearchBar: () => null }));
jest.mock('./onboarding/generate_split_button', () => ({ GenerateSplitButton: () => null }));
jest.mock('./find_significant_events_button', () => ({ FindSignificantEventsButton: () => null }));
jest.mock('./sources_table', () => ({
  SourcesTable: ({
    sources,
    onOpenSource,
  }: {
    sources: NightshiftSource[];
    onOpenSource: (source: NightshiftSource) => void;
  }) => (
    <>
      {sources.map((source) => (
        <button key={source.id} onClick={() => onOpenSource(source)}>
          {source.title}
        </button>
      ))}
    </>
  ),
}));
jest.mock('./source_flyout/source_flyout', () => ({
  SourceFlyout: ({
    source,
    readOnly,
    onClose,
  }: {
    source?: NightshiftSource;
    readOnly: boolean;
    onClose: () => void;
  }) => (
    <div data-test-subj="sourceFlyout">
      {source?.id ?? 'new'}
      {readOnly && <span>Read only</span>}
      <button onClick={onClose}>Close source</button>
    </div>
  ),
}));

const renderSources = (initialPath: string) => {
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const renderView = () => (
    <I18nProvider>
      <Router history={history}>
        <Route path="/sources/:sourceId?">
          <SourcesView />
        </Route>
      </Router>
    </I18nProvider>
  );
  const view = render(renderView());
  return { history, rerenderSources: () => view.rerender(renderView()) };
};

describe('SourcesView routes', () => {
  beforeEach(() => {
    mockSources = [createSource('source-1'), createSource('source-2')];
    mockCanManage = true;
    mockIsSourcesLoading = false;
    mockIsSourcesError = false;
    mockToasts.addWarning.mockClear();
  });

  it('replaces the create route with the list for a read-only user', async () => {
    mockCanManage = false;
    const { history } = renderSources('/sources/new?rangeFrom=now-24h&rangeTo=now');

    await waitFor(() => expect(history.location.pathname).toBe('/sources'));
    expect(history.action).toBe('REPLACE');
    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
    expect(screen.queryByTestId('sourceFlyout')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create source' })).not.toBeInTheDocument();
  });

  it('warns for an unknown source and replaces its URL with the list', async () => {
    const { history } = renderSources('/sources/missing?rangeFrom=now-24h&rangeTo=now');

    await waitFor(() => expect(history.location.pathname).toBe('/sources'));
    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
    expect(history.action).toBe('REPLACE');
    expect(mockToasts.addWarning).toHaveBeenCalledTimes(1);
    expect(mockToasts.addWarning).toHaveBeenCalledWith({ title: 'Source not found' });
  });

  it('shows a loading state instead of an empty list until the first source list arrives', () => {
    mockSources = [];
    mockIsSourcesLoading = true;
    renderSources('/sources');

    expect(screen.getByTestId('significantEventsAppSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventsAppSourcesEmptyPrompt')).not.toBeInTheDocument();
    expect(screen.queryByText('0 sources')).not.toBeInTheDocument();
  });

  it('waits for the source list before resolving a deep link', async () => {
    mockSources = [];
    mockIsSourcesLoading = true;
    const { history, rerenderSources } = renderSources('/sources/source-1');

    expect(history.location.pathname).toBe('/sources/source-1');
    expect(mockToasts.addWarning).not.toHaveBeenCalled();

    mockSources = [createSource('source-1')];
    mockIsSourcesLoading = false;
    rerenderSources();

    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('source-1');
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });

  it('keeps a deep link when the source list request fails', () => {
    mockSources = [];
    mockIsSourcesError = true;
    const { history } = renderSources('/sources/source-1');

    expect(history.location.pathname).toBe('/sources/source-1');
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
    expect(screen.getByTestId('significantEventsAppSourcesLoadErrorPrompt')).toBeInTheDocument();
  });
});
