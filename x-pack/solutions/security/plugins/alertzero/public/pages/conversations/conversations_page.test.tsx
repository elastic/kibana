/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, type MemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { useProposalsList } from '../../hooks/use_proposals_api';
import type { ProposalItem } from '../../../common/proposals/list';
import { ConversationsPage } from './conversations_page';

jest.mock('../../hooks/use_proposals_api');
jest.mock('../../components/proposals_trend_chart', () => ({
  ProposalsTrendChartRow: () => null,
}));

const mockUseProposalsList = useProposalsList as jest.Mock;

// The queue renders proposals adapted into the Investigation shape, and the adapter keeps
// the proposal id as the investigation id, so the URL still addresses this row by `id`.
const proposal: ProposalItem = {
  id: 'inv-1',
  spaceId: 'default',
  conversationId: 'conv-1',
  conversationTitle: 'Impossible travel — exec account',
  comment: 'MFA satisfied from two countries in 40 minutes.',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'investigate',
  origin: 'worker',
  createdAt: '2024-01-01T00:00:00Z',
  expired: false,
};

const renderPage = (initialEntry: string) => {
  const core = coreMock.createStart();
  const history: MemoryHistory = createMemoryHistory({ initialEntries: [initialEntry] });

  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={core}>
          <Router history={history}>
            <ConversationsPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

  return { core, history };
};

describe('ConversationsPage details flyout URL state', () => {
  beforeEach(() => {
    mockUseProposalsList.mockReturnValue({
      data: { groups: { investigate: [proposal] }, total: 1, truncated: false },
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('opens the flyout for a conversation named in the URL', async () => {
    renderPage('/?selectedConversationId=inv-1&show=overview');

    const flyout = await screen.findByTestId('investigationDetailsFlyout');

    // The title also appears on the card behind the flyout, so scope the assertion.
    expect(within(flyout).getByText('Impossible travel — exec account')).toBeInTheDocument();
  });

  it('keeps the flyout closed with no conversation in the URL', () => {
    renderPage('/');

    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
  });

  it('ignores an unrecognized tab, leaving the URL untouched', () => {
    const { core, history } = renderPage('/?selectedConversationId=inv-1&show=nonsense');

    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=nonsense');
  });

  it('completes a bare conversation id and opens the flyout', async () => {
    const { history } = renderPage('/?selectedConversationId=inv-1');

    expect(await screen.findByTestId('investigationDetailsFlyout')).toBeInTheDocument();
    expect(history.location.search).toBe('?selectedConversationId=inv-1&show=overview');
  });

  it('shows skeleton content until the proposals resolve', () => {
    mockUseProposalsList.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    renderPage('/?selectedConversationId=inv-1&show=overview');

    expect(screen.getByTestId('investigationDetailsFlyoutBodySkeleton')).toBeInTheDocument();
  });

  it('closes the flyout and warns when no investigation matches the id', async () => {
    const { core, history } = renderPage('/?selectedConversationId=missing&show=overview');

    await waitFor(() => {
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    });
    expect(core.notifications.toasts.addDanger).toHaveBeenCalledWith(
      expect.stringContaining('missing')
    );
    expect(history.location.search).toBe('');
    expect(screen.queryByTestId('investigationDetailsFlyout')).not.toBeInTheDocument();
  });

  it('leaves no history entry pointing at the missing conversation', async () => {
    const { core, history } = renderPage('/?selectedConversationId=missing&show=overview');

    await waitFor(() => {
      expect(core.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    });

    // Going back must not land on the bad id and warn all over again.
    expect(history.entries.map((entry) => entry.search)).not.toContain(
      '?selectedConversationId=missing&show=overview'
    );
  });

  it('does not warn while the proposals are still loading', () => {
    mockUseProposalsList.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    const { core } = renderPage('/?selectedConversationId=missing&show=overview');

    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });
});
