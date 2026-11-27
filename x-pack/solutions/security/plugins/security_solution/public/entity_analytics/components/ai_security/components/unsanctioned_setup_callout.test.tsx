/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecurityPageName } from '../../../../../common/constants';
import { TestProviders } from '../../../../common/mock';
import { useGetWatchlists } from '../../../api/hooks/use_get_watchlists';
import {
  UnsanctionedSetupCallout,
  UNSANCTIONED_SETUP_CALLOUT_TEST_ID,
} from './unsanctioned_setup_callout';

const WATCHLIST_ID = 'unsanctioned-ai-agents-watchlist-id-gen-demo';
const mockListSources = jest.fn();

jest.mock('../../../api/hooks/use_get_watchlists', () => ({ useGetWatchlists: jest.fn() }));
jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ listWatchlistEntitySources: mockListSources }),
}));
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));
jest.mock('../../../../common/components/links', () => ({
  SecuritySolutionLinkAnchor: ({
    deepLinkId,
    path,
    children,
    'data-test-subj': dataTestSubj,
  }: {
    deepLinkId: string;
    path: string;
    children: React.ReactNode;
    'data-test-subj': string;
  }) => (
    <a href={`${deepLinkId}${path}`} data-test-subj={dataTestSubj}>
      {children}
    </a>
  ),
}));

const mockWatchlists = (watchlists: Array<Record<string, unknown>>) =>
  (useGetWatchlists as jest.Mock).mockReturnValue({ data: watchlists });

const renderCallout = (hasMemberRows = false) =>
  render(
    <TestProviders>
      <UnsanctionedSetupCallout watchlistId={WATCHLIST_ID} hasMemberRows={hasMemberRows} />
    </TestProviders>
  );

describe('UnsanctionedSetupCallout', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockListSources.mockReset().mockResolvedValue({ sources: [], page: 1, per_page: 10, total: 0 });
  });

  it('explains the watchlist and links to it when it has no source and no members', async () => {
    mockWatchlists([{ id: WATCHLIST_ID, name: 'Unsanctioned AI agents', entityCount: 0 }]);
    renderCallout();
    const callout = await screen.findByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID);
    expect(callout).toHaveTextContent('Your organization decides what counts as unsanctioned');
    expect(screen.getByTestId('aiSecurityUnsanctionedSetupLink')).toHaveAttribute(
      'href',
      `${SecurityPageName.entityAnalyticsManagement}/watchlists?editWatchlistId=${WATCHLIST_ID}`
    );
    expect(mockListSources).toHaveBeenCalledWith(
      expect.objectContaining({ watchlistId: WATCHLIST_ID })
    );
  });

  it('stays dismissed once dismissed', async () => {
    mockWatchlists([{ id: WATCHLIST_ID, name: 'Unsanctioned AI agents' }]);
    const { unmount } = renderCallout();
    fireEvent.click(
      await screen.findByRole('button', { name: /dismiss/i }, { container: document.body })
    );
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
    unmount();
    renderCallout();
    await waitFor(() => expect(mockListSources).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows nothing once the watchlist has a source', async () => {
    mockWatchlists([{ id: WATCHLIST_ID, name: 'Unsanctioned AI agents' }]);
    mockListSources.mockResolvedValue({
      sources: [{ id: 'kql' }],
      page: 1,
      per_page: 10,
      total: 1,
    });
    renderCallout();
    await waitFor(() => expect(mockListSources).toHaveBeenCalled());
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows nothing once the watchlist has members', async () => {
    mockWatchlists([{ id: WATCHLIST_ID, name: 'Unsanctioned AI agents', hasManualEntities: true }]);
    renderCallout();
    await waitFor(() => expect(mockListSources).toHaveBeenCalled());
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows nothing when an install already carries the watchlist', async () => {
    mockWatchlists([{ id: WATCHLIST_ID, name: 'Unsanctioned AI agents' }]);
    renderCallout(true);
    await waitFor(() => expect(mockListSources).toHaveBeenCalled());
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });

  it('shows nothing, and reads no sources, when the prebuilt watchlist is not installed', () => {
    mockWatchlists([{ id: 'departing', name: 'Departing employees' }]);
    renderCallout();
    expect(mockListSources).not.toHaveBeenCalled();
    expect(screen.queryByTestId(UNSANCTIONED_SETUP_CALLOUT_TEST_ID)).not.toBeInTheDocument();
  });
});
