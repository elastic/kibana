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
import type { Investigation } from '@kbn/alertzero-common';
import { useInvestigations } from '../../hooks/use_investigations_api';
import { ConversationsPage } from './conversations_page';

jest.mock('../../hooks/use_investigations_api');
jest.mock('../../components/pending_proposals', () => ({
  PendingProposalsPanel: () => null,
}));

const mockUseInvestigations = useInvestigations as jest.Mock;

const investigation: Investigation = {
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Impossible travel — exec account',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  status: 'open',
  recommendedAction: 'investigate',
  pendingProposalCount: 0,
  events: [],
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
    mockUseInvestigations.mockReturnValue({
      data: { investigations: [investigation], total: 1 },
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

  it('shows skeleton content until the investigations resolve', () => {
    mockUseInvestigations.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

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

  it('does not warn while the investigations are still loading', () => {
    mockUseInvestigations.mockReturnValue({ data: undefined, isLoading: true, error: undefined });

    const { core } = renderPage('/?selectedConversationId=missing&show=overview');

    expect(core.notifications.toasts.addDanger).not.toHaveBeenCalled();
  });
});
