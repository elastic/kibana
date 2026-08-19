/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EntitySummaryGridMini } from './entity_summary_grid';

const mockFetch = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: {
        fetch: (...args: unknown[]) => mockFetch(...args),
      },
    },
  }),
}));

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });

const renderGrid = (props: Partial<React.ComponentProps<typeof EntitySummaryGridMini>> = {}) => {
  const defaults: React.ComponentProps<typeof EntitySummaryGridMini> = {
    entityId: 'entity-1',
    source: 'okta',
    assetCriticality: 'high_impact',
    watchlistIds: [],
    watchlistsEnabled: false,
  };
  return render(
    <I18nProvider>
      <QueryClientProvider client={makeClient()}>
        <EntitySummaryGridMini {...defaults} {...props} />
      </QueryClientProvider>
    </I18nProvider>
  );
};

describe('EntitySummaryGridMini', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders the four summary panels', () => {
    renderGrid();
    expect(screen.getByTestId('entityAttachmentSummaryEntityId')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentSummaryDataSource')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentSummaryAssetCriticality')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentSummaryWatchlists')).toBeInTheDocument();
  });

  it('renders the entity id with a copy button', () => {
    renderGrid({ entityId: 'entity-xyz' });
    expect(screen.getByText('entity-xyz')).toBeInTheDocument();
    expect(screen.getByTestId('entityAttachmentGridEntityIdCopy')).toBeInTheDocument();
  });

  it('falls back to an em-dash when entity id is missing', () => {
    renderGrid({ entityId: undefined });
    const panel = screen.getByTestId('entityAttachmentSummaryEntityId');
    expect(panel.textContent).toContain('—');
  });

  it('does not fetch watchlists when watchlists are disabled', () => {
    renderGrid({ watchlistsEnabled: false, watchlistIds: ['w-1'] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not fetch watchlists when the list is empty', () => {
    renderGrid({ watchlistsEnabled: true, watchlistIds: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves watchlist ids to names and shows a +N overflow badge', async () => {
    mockFetch.mockResolvedValue([
      { id: 'w-1', name: 'VIP users' },
      { id: 'w-2', name: 'Contractors' },
      { id: 'w-3', name: 'Test accounts' },
    ]);

    renderGrid({ watchlistsEnabled: true, watchlistIds: ['w-1', 'w-2', 'w-3'] });

    await waitFor(() => {
      expect(screen.getByText('VIP users')).toBeInTheDocument();
    });
    expect(screen.getByTestId('entityAttachmentGridWatchlists-more')).toHaveTextContent('+2');
  });

  it('falls back to the raw id when a watchlist cannot be resolved', async () => {
    mockFetch.mockResolvedValue([]);

    renderGrid({ watchlistsEnabled: true, watchlistIds: ['unknown-id'] });

    await waitFor(() => {
      expect(screen.getByText('unknown-id')).toBeInTheDocument();
    });
  });
});
