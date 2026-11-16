/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router } from '@kbn/shared-ux-router';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { I18nProvider } from '@kbn/i18n-react';
import type { RecommendedSourcesCreationState } from '../components/entities/source/recommended_sources/recommended_sources_table';
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
let mockCanConfigure = true;
let mockIsSourcesLoading = false;
let mockIsSourcesFetching = false;
let mockIsSourcesError = false;
const mockToasts = { addWarning: jest.fn() };

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          nightshift: { show: true, manage: mockCanManage, configure: mockCanConfigure },
        },
      },
      notifications: { toasts: mockToasts },
    },
  }),
}));
jest.mock('./onboarding/ki_generation_context', () => ({
  useKiGeneration: () => ({
    sources: mockSources,
    isSourcesLoading: mockIsSourcesLoading,
    isSourcesFetching: mockIsSourcesFetching,
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
jest.mock('./onboarding/generate_split_button', () => ({
  GenerateSplitButton: () => <button data-test-subj="generateSplitButtonStub">Generate</button>,
}));
jest.mock('./find_significant_events_button', () => ({
  FindSignificantEventsButton: () => (
    <button data-test-subj="findSignificantEventsButtonStub">Find significant events</button>
  ),
}));
let mockRecommendedSourcesTableMountCount = 0;
jest.mock('../components/entities/source/recommended_sources/recommended_sources_table', () => ({
  INITIAL_RECOMMENDED_SOURCES_CREATION_STATE: {
    isCreating: false,
    hasCreatedSources: false,
    hasFailedDrafts: false,
  },
  RecommendedSourcesTable: ({
    onCreationStateChange,
  }: {
    onCreationStateChange: (state: RecommendedSourcesCreationState) => void;
  }) => {
    const [draftMarker] = React.useState(() => {
      mockRecommendedSourcesTableMountCount++;
      return 'retained draft';
    });
    return (
      <div data-test-subj="recommendedSourcesTableStub">
        {draftMarker}
        <button
          data-test-subj="simulatePartialSourceCreation"
          onClick={() =>
            onCreationStateChange({
              isCreating: false,
              hasCreatedSources: true,
              hasFailedDrafts: true,
            })
          }
        >
          Simulate partial source creation
        </button>
        <button
          data-test-subj="simulateFailedSourceCreation"
          onClick={() =>
            onCreationStateChange({
              isCreating: false,
              hasCreatedSources: false,
              hasFailedDrafts: true,
            })
          }
        >
          Simulate failed source creation
        </button>
        <button
          data-test-subj="simulateCompletedSourceCreation"
          onClick={() =>
            onCreationStateChange({
              isCreating: false,
              hasCreatedSources: true,
              hasFailedDrafts: false,
            })
          }
        >
          Simulate completed source creation
        </button>
      </div>
    );
  },
}));
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
jest.mock('../components/entities/source/source_flyout/source_flyout', () => ({
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
    mockCanConfigure = true;
    mockIsSourcesLoading = false;
    mockIsSourcesFetching = false;
    mockIsSourcesError = false;
    mockRecommendedSourcesTableMountCount = 0;
    mockToasts.addWarning.mockClear();
  });

  it('opens the create flyout for a manager at /sources/new', async () => {
    renderSources('/sources/new');

    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('new');
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

  it('treats a user with manage but without configure as read-only', async () => {
    mockCanConfigure = false;
    const { history } = renderSources('/sources/new');

    await waitFor(() => expect(history.location.pathname).toBe('/sources'));
    expect(screen.queryByRole('button', { name: 'Create source' })).not.toBeInTheDocument();
  });

  it('shows an existing source as read-only to a user with manage but without configure', async () => {
    mockCanConfigure = false;
    renderSources('/sources/source-2');

    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('Read only');
  });

  it('opens a source deep link and preserves the query string when closing', async () => {
    const { history } = renderSources('/sources/source-1?rangeFrom=now-24h&rangeTo=now');

    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('source-1');
    fireEvent.click(screen.getByRole('button', { name: 'Close source' }));

    expect(history.location.pathname).toBe('/sources');
    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
    expect(history.action).toBe('PUSH');
    expect(screen.queryByTestId('sourceFlyout')).not.toBeInTheDocument();

    act(() => history.goBack());
    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('source-1');
  });

  it('shows an existing source as read-only without the manage privilege', async () => {
    mockCanManage = false;
    renderSources('/sources/source-2');

    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('source-2');
    expect(screen.getByTestId('sourceFlyout')).toHaveTextContent('Read only');
  });

  it('opens a selected source through its URL and preserves the query string', async () => {
    const { history } = renderSources('/sources?rangeFrom=now-24h&rangeTo=now');
    fireEvent.click(screen.getByRole('button', { name: 'Source source-2' }));

    expect(history.location.pathname).toBe('/sources/source-2');
    expect(history.location.search).toBe('?rangeFrom=now-24h&rangeTo=now');
    expect(await screen.findByTestId('sourceFlyout')).toHaveTextContent('source-2');
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

  it('shows the empty prompt and recommended sources to a manager with no sources', () => {
    mockSources = [];
    renderSources('/sources');

    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('Create your first source')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRecommendedSourcesTitle')).toHaveTextContent(
      'Add Recommended Sources'
    );
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
    expect(screen.queryByTestId('significantEventsAppCreateSourceButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('generateSplitButtonStub')).not.toBeInTheDocument();
    expect(screen.queryByTestId('findSignificantEventsButtonStub')).not.toBeInTheDocument();
  });

  it('keeps failed drafts after partial creation adds a source', () => {
    mockSources = [];
    const { rerenderSources } = renderSources('/sources');

    mockSources = [createSource('source-1')];
    fireEvent.click(screen.getByTestId('simulatePartialSourceCreation'));

    expect(screen.queryByTestId('significantEventsAppSourcesEmptyPrompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRecommendedSourcesTitle')).toHaveTextContent(
      'Add Recommended Sources'
    );
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source source-1' })).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toHaveTextContent('retained draft');
    expect(mockRecommendedSourcesTableMountCount).toBe(1);

    mockSources = [];
    rerenderSources();

    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toHaveTextContent('retained draft');
    expect(mockRecommendedSourcesTableMountCount).toBe(1);

    mockIsSourcesFetching = true;
    rerenderSources();
    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();

    mockIsSourcesFetching = false;
    mockIsSourcesError = true;
    rerenderSources();
    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toHaveTextContent('retained draft');
    expect(mockRecommendedSourcesTableMountCount).toBe(1);
  });

  it('keeps the empty setup mounted when its source refresh fails', () => {
    mockSources = [];
    const { rerenderSources } = renderSources('/sources');

    mockIsSourcesError = true;
    rerenderSources();

    expect(screen.getByTestId('significantEventsAppSourcesLoadErrorPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toHaveTextContent('retained draft');
    expect(mockRecommendedSourcesTableMountCount).toBe(1);
  });

  it('keeps failed drafts when the source refresh after partial creation fails', () => {
    mockSources = [];
    renderSources('/sources');

    mockIsSourcesError = true;
    fireEvent.click(screen.getByTestId('simulatePartialSourceCreation'));

    expect(screen.getByTestId('significantEventsAppSourcesLoadErrorPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRecommendedSourcesTitle')).toHaveTextContent(
      'Add Recommended Sources'
    );
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
  });

  it('returns to initial setup when created sources are later deleted', () => {
    mockSources = [];
    const { rerenderSources } = renderSources('/sources');

    mockSources = [createSource('source-1')];
    fireEvent.click(screen.getByTestId('simulateCompletedSourceCreation'));

    expect(screen.queryByTestId('significantEventsAppSourcesEmptyPrompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recommendedSourcesTableStub')).not.toBeInTheDocument();

    mockSources = [];
    rerenderSources();

    expect(screen.getByTestId('significantEventsAppSourcesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
    expect(mockRecommendedSourcesTableMountCount).toBe(2);
  });

  it('keeps all failed drafts when the source refresh also fails', () => {
    mockSources = [];
    renderSources('/sources');

    mockIsSourcesError = true;
    fireEvent.click(screen.getByTestId('simulateFailedSourceCreation'));

    expect(screen.getByTestId('significantEventsAppSourcesLoadErrorPrompt')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftRecommendedSourcesTitle')).toHaveTextContent(
      'Add Recommended Sources'
    );
    expect(screen.getByTestId('recommendedSourcesTableStub')).toBeInTheDocument();
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

  it('waits for a refetch before treating a deep link missing from cached sources as unknown', async () => {
    mockSources = [];
    mockIsSourcesFetching = true;
    const { history, rerenderSources } = renderSources('/sources/source-1');

    expect(history.location.pathname).toBe('/sources/source-1');
    expect(mockToasts.addWarning).not.toHaveBeenCalled();

    mockSources = [createSource('source-1')];
    mockIsSourcesFetching = false;
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
    expect(screen.queryByTestId('recommendedSourcesTableStub')).not.toBeInTheDocument();
    expect(screen.getByTestId('significantEventsAppCreateSourceButton')).toBeInTheDocument();
  });
});
