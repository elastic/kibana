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
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { RuleBasedSourceInput } from './rule_based_source_input';
import type { RuleBasedSourceInputProps } from './rule_based_source_input';
import { getToggleButtons } from './hooks/rule_based_source_helpers';
import { useGetWatchlistFormData } from './hooks/use_get_watchlist_form_data';

const mockGetWatchlist = jest.fn();
const mockListWatchlistEntitySources = jest.fn();
const mockUpdateWatchlistEntitySource = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    getWatchlist: mockGetWatchlist,
    listWatchlistEntitySources: mockListWatchlistEntitySources,
    updateWatchlistEntitySource: mockUpdateWatchlistEntitySource,
  }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { notifications: { toasts: { addError: mockAddError } } },
  }),
}));

jest.mock('../../../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: () => ({ dataView: undefined, status: 'loading' }),
}));

jest.mock('./hooks/use_data_view_setup', () => ({
  useDataViewSetup: () => ({ filters: [], filterManager: {} }),
}));

jest.mock('./hooks/use_fetch_watchlist_indices', () => ({
  useFetchWatchlistIndices: () => ({ data: [], isFetching: false, error: null }),
}));

jest.mock('../../../../common/components/query_bar', () => ({
  QueryBar: () => <div data-test-subj="mockQueryBar" />,
}));

const WATCHLIST_ID = 'watchlist-1';
const SOURCE_ID = 'source-1';

const MISSING_API_KEY_TITLE = 'Sync paused — re-authorization required';
const MISSING_API_KEY_DESCRIPTION =
  'This data source is not authorized to read from the configured index';

const buildIndexSource = (
  overrides: Partial<MonitoringEntitySource> = {}
): MonitoringEntitySource => ({
  id: SOURCE_ID,
  type: 'index',
  name: 'my-index-source',
  indexPattern: 'logs-*',
  identifierField: 'user.name',
  enabled: true,
  range: { start: 'now-10d', end: 'now' },
  ...overrides,
});

const ruleBasedSourceStub = (): RuleBasedSourceInputProps['ruleBasedSource'] => ({
  activeToggle: 'indexPattern',
  filterQuery: { query: '', language: 'kuery' },
  selectedIndexPatterns: [{ label: 'logs-*' }],
  entityField: 'user.name',
  range: { start: 'now-10d', end: 'now' },
  isNone: false,
  isEntityStore: false,
  savedQuery: undefined,
  toggleButtons: getToggleButtons(),
  validation: { isValid: true, errors: {} },
  isValid: true,
  isValidatingTimestamp: false,
  indexPatternMissingTimestamp: false,
  onToggleChange: jest.fn(),
  onQueryChange: jest.fn(),
  onSavedQueryChange: jest.fn(),
  onIndexPatternsChange: jest.fn(),
  onEntityFieldChange: jest.fn(),
  onRangeChange: jest.fn(),
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <QueryClientProvider client={createQueryClient()}>{ui}</QueryClientProvider>
    </I18nProvider>
  );

/**
 * Wires the real form data hook into the component, like the edit flyout does, so a
 * re-authorization exercises the invalidation of the entity sources query end to end.
 */
const EditFlyoutHarness = () => {
  const { indexSourceWithMissingApiKey } = useGetWatchlistFormData(WATCHLIST_ID);
  return (
    <RuleBasedSourceInput
      watchlistId={WATCHLIST_ID}
      indexSourceWithMissingApiKey={indexSourceWithMissingApiKey}
      ruleBasedSource={ruleBasedSourceStub()}
    />
  );
};

describe('RuleBasedSourceInput — index source API key', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the index source is missing its API key', () => {
    const renderMissingKey = () =>
      renderWithProviders(
        <RuleBasedSourceInput
          watchlistId={WATCHLIST_ID}
          indexSourceWithMissingApiKey={buildIndexSource({ apiKeyId: undefined })}
          ruleBasedSource={ruleBasedSourceStub()}
        />
      );

    it('shows the sync paused warning with a Re-authorize button', () => {
      renderMissingKey();

      expect(screen.getByText(MISSING_API_KEY_TITLE)).toBeInTheDocument();
      expect(screen.getByText(MISSING_API_KEY_DESCRIPTION, { exact: false })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Re-authorize' })).toBeInTheDocument();
    });

    it('re-authorizes the index source when Re-authorize is clicked', async () => {
      mockUpdateWatchlistEntitySource.mockResolvedValue(buildIndexSource({ apiKeyId: 'new-kid' }));
      renderMissingKey();

      fireEvent.click(screen.getByRole('button', { name: 'Re-authorize' }));

      await waitFor(() => expect(mockUpdateWatchlistEntitySource).toHaveBeenCalledTimes(1));
      expect(mockUpdateWatchlistEntitySource).toHaveBeenCalledWith({
        watchlistId: WATCHLIST_ID,
        entitySourceId: SOURCE_ID,
        body: { type: 'index' },
      });
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });

  it('does not show the warning when every index source has an API key', () => {
    renderWithProviders(
      <RuleBasedSourceInput
        watchlistId={WATCHLIST_ID}
        indexSourceWithMissingApiKey={undefined}
        ruleBasedSource={ruleBasedSourceStub()}
      />
    );

    // Positive anchor first: the index source form is rendered, so the callout decision was made.
    expect(screen.getByTestId('watchlistIndexPatternComboBox')).toBeInTheDocument();
    expect(screen.queryByText(MISSING_API_KEY_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Re-authorize' })).not.toBeInTheDocument();
  });

  it('hides the warning after re-authorization refetches the entity sources', async () => {
    mockGetWatchlist.mockResolvedValue({
      id: WATCHLIST_ID,
      name: 'Test watchlist',
      riskModifier: 1,
    });
    mockListWatchlistEntitySources
      .mockResolvedValueOnce({ sources: [buildIndexSource({ apiKeyId: undefined })] })
      .mockResolvedValue({ sources: [buildIndexSource({ apiKeyId: 'new-kid' })] });
    mockUpdateWatchlistEntitySource.mockResolvedValue(buildIndexSource({ apiKeyId: 'new-kid' }));

    renderWithProviders(<EditFlyoutHarness />);

    fireEvent.click(await screen.findByRole('button', { name: 'Re-authorize' }));

    await waitFor(() => expect(screen.queryByText(MISSING_API_KEY_TITLE)).not.toBeInTheDocument());
    expect(mockUpdateWatchlistEntitySource).toHaveBeenCalledWith({
      watchlistId: WATCHLIST_ID,
      entitySourceId: SOURCE_ID,
      body: { type: 'index' },
    });
    expect(mockListWatchlistEntitySources).toHaveBeenCalledTimes(2);
    expect(mockListWatchlistEntitySources).toHaveBeenLastCalledWith(
      expect.objectContaining({ watchlistId: WATCHLIST_ID })
    );
  });
});
