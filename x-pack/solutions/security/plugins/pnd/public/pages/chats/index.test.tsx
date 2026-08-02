/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { PND_CONVERSATIONS_URL, PND_PROPOSALS_URL } from '@kbn/pnd-common';
import type { PndConversation } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import {
  mockNestedContainThread,
  mockNestedConversations,
  mockNestedIncident,
  mockNestedInvestigation,
  mockNestedOpenInvestigationThread,
  mockNestedTuning,
} from './mock/conversations';
import { ChatsPage } from '.';

/**
 * Retries are switched off here so a 503 reaches its state on the first render rather than after
 * three exponential-backoff attempts. The predicate is unit-tested in `hooks/retry_on_transient_error`.
 */
jest.mock('../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const EmbeddableConversation: React.FC = () => <div data-test-subj="mockEmbeddableConversation" />;

const EMPTY_PROPOSALS = createHttpResponse({ body: { groups: [], total: 0 } });

const conversationsForKind = (
  kind: unknown
): { conversations: PndConversation[]; total: number } => {
  if (kind === 'incident') {
    return {
      conversations: [
        mockNestedIncident,
        mockNestedContainThread,
        mockNestedTuning,
        mockNestedInvestigation,
      ],
      total: 1,
    };
  }

  if (kind === 'investigation') {
    return {
      conversations: [mockNestedInvestigation, mockNestedOpenInvestigationThread],
      total: 1,
    };
  }

  return { conversations: mockNestedConversations, total: mockNestedConversations.length };
};

describe('ChatsPage', () => {
  const get = jest.fn();
  const mockGetUrlForApp = jest.fn();
  const mockNavigateToApp = jest.fn();

  const services = {
    agentBuilder: { EmbeddableConversation },
    application: { getUrlForApp: mockGetUrlForApp, navigateToApp: mockNavigateToApp },
    chrome: { docTitle: { change: jest.fn(), reset: jest.fn() } },
    http: { get },
  };

  const stubConversations = (error?: Error) => {
    get.mockImplementation(async (path: string, options?: { query?: { kind?: string } }) => {
      if (path === PND_CONVERSATIONS_URL) {
        if (error != null) {
          throw error;
        }

        return conversationsForKind(options?.query?.kind);
      }

      if (path === PND_PROPOSALS_URL) {
        return EMPTY_PROPOSALS;
      }

      return { attachments: [], total: 0 };
    });
  };

  const renderPage = (route = '/chats') =>
    renderWithPndProviders(<ChatsPage />, { route, services });

  const waitForGroups = async () => {
    await waitFor(() =>
      expect(screen.queryAllByTestId('pndQueueThreadGroupCard').length).toBeGreaterThan(0)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockImplementation(
      (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`
    );
    stubConversations();
  });

  it('renders incidents before investigations', async () => {
    renderPage();
    await waitForGroups();

    const sections = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    expect(sections.indexOf('Incidents')).toBeLessThan(sections.indexOf('Investigations'));
  });

  it('nests the incident group via ThreadGroupCard', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKindGroup-incident')).toHaveTextContent(
      mockNestedIncident.title
    );
  });

  it('nests tuning under its incident rather than as a top-level group', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKindGroup-incident')).toHaveTextContent(
      mockNestedTuning.title
    );
    expect(screen.queryByRole('heading', { name: 'Tuning' })).not.toBeInTheDocument();
  });

  it('shows the originating investigation by traversing promotedFrom', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKindGroup-incident')).toHaveTextContent(
      mockNestedInvestigation.title
    );
  });

  it('nests investigation-parented threads under the investigation', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKindGroup-investigation')).toHaveTextContent(
      mockNestedOpenInvestigationThread.title
    );
  });

  it('does not hang the incident under the investigation', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKindGroup-investigation')).not.toHaveTextContent(
      mockNestedIncident.title
    );
  });

  it('renders no type badges', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.queryByTestId('pndConversationKindBadge')).not.toBeInTheDocument();
  });

  it('keeps the search box', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsSearch')).toBeInTheDocument();
  });

  it('replaces the filter pills with the KPI tiles', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKpiSlot')).toBeInTheDocument();
    expect(screen.getByTestId('pndChatsKpiTiles')).toBeInTheDocument();
    expect(screen.queryByTestId('pndChatsKindFilter-all')).not.toBeInTheDocument();
  });

  it('counts all four conversation categories on the KPI tiles', async () => {
    renderPage();
    await waitForGroups();

    expect(screen.getByTestId('pndChatsKpiTile-all')).toBeInTheDocument();
    expect(screen.getByTestId('pndChatsKpiTile-investigation')).toBeInTheDocument();
    expect(screen.getByTestId('pndChatsKpiTile-incident')).toBeInTheDocument();
    expect(screen.getByTestId('pndChatsKpiTile-thread')).toBeInTheDocument();
  });

  it('shows four zero tiles when the search matches nothing', async () => {
    renderPage();
    await waitForGroups();

    fireEvent.change(screen.getByTestId('pndChatsSearch'), { target: { value: 'no such attack' } });

    expect(screen.getByTestId('pndChatsKpiTileCount-all')).toHaveTextContent('0');
  });

  it('pages each kind independently', async () => {
    renderPage();
    await waitForGroups();

    expect(get).toHaveBeenCalledWith(
      PND_CONVERSATIONS_URL,
      expect.objectContaining({
        query: expect.objectContaining({ kind: 'incident', page: 1, perPage: 10 }),
      })
    );
    expect(get).toHaveBeenCalledWith(
      PND_CONVERSATIONS_URL,
      expect.objectContaining({
        query: expect.objectContaining({ kind: 'investigation', page: 1, perPage: 10 }),
      })
    );
  });

  it('filters the loaded groups by the search query', async () => {
    renderPage();
    await waitForGroups();

    fireEvent.change(screen.getByTestId('pndChatsSearch'), {
      target: { value: 'credential dumping' },
    });

    expect(screen.getByTestId('pndChatsKindGroup-incident')).toBeInTheDocument();
    expect(screen.queryByTestId('pndChatsKindGroup-investigation')).not.toBeInTheDocument();
  });

  it('says the list is filtered rather than empty when nothing matches', async () => {
    renderPage();
    await waitForGroups();

    fireEvent.change(screen.getByTestId('pndChatsSearch'), { target: { value: 'no such attack' } });

    expect(screen.getByTestId('pndChatsNoMatches')).toBeInTheDocument();
  });

  it('opens the parent from the group header into the detail panel', async () => {
    renderPage();
    await waitForGroups();

    fireEvent.click(screen.getAllByTestId('pndQueueThreadGroupHeader')[0]);

    expect(await screen.findByTestId('pndChatsDetailPanelTitle')).toHaveTextContent(
      mockNestedIncident.title
    );
  });

  it('opens the conversation in Agent Builder from the group chat control', async () => {
    renderPage();
    await waitForGroups();

    fireEvent.click(screen.getAllByTestId('pndQueueThreadGroupOpenInChat')[0]);

    expect(mockNavigateToApp).toHaveBeenCalledWith('agent_builder', {
      openInNewTab: true,
      path: `/conversations/${mockNestedIncident.id}`,
    });
  });

  it('renders the empty state when the space has no PND conversations yet', async () => {
    get.mockImplementation(async (path: string) => {
      if (path === PND_CONVERSATIONS_URL) {
        return { conversations: [], total: 0 };
      }

      if (path === PND_PROPOSALS_URL) {
        return EMPTY_PROPOSALS;
      }

      return { attachments: [], total: 0 };
    });
    renderPage();

    expect(await screen.findByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('renders "Workflows unavailable" for a 503, never "no conversations"', async () => {
    stubConversations(createHttpFetchError({ status: 503 }));
    renderPage();

    expect(await screen.findByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('renders the error state for a 500', async () => {
    stubConversations(createHttpFetchError({ status: 500 }));
    renderPage();

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('keeps the general "ask PND" chat available even when the list could not be read', async () => {
    stubConversations(createHttpFetchError({ status: 503 }));
    renderPage();
    await screen.findByTestId('pndWorkflowsUnavailableState');

    expect(screen.getByTestId('pndAskPndToggle')).toBeInTheDocument();
  });

  it('sets the document title', async () => {
    renderPage();
    await waitForGroups();

    expect(services.chrome.docTitle.change).toHaveBeenCalledWith('Chats - AlertZero');
  });

  describe('opening one thread from a deep link (?conversationId=)', () => {
    it('opens the detail panel on the conversation the URL named', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);

      expect(await screen.findByTestId('pndChatsDetailPanel')).toBeInTheDocument();
    });

    it('shows that conversation in the panel rather than whichever row sorted first', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);

      expect(await screen.findByTestId('pndChatsDetailPanelTitle')).toHaveTextContent(
        mockNestedIncident.title
      );
    });

    it('renders the plain list for an id no conversation matches, never an error page', async () => {
      renderPage('/chats?conversationId=no-such-conversation');
      await waitForGroups();

      expect(screen.queryByTestId('pndChatsDetailPanel')).not.toBeInTheDocument();
    });

    it('closes the panel by clearing the param, so Back and the close button agree', async () => {
      const { history } = renderPage(`/chats?conversationId=${mockNestedIncident.id}`);
      await screen.findByTestId('pndChatsDetailPanel');

      fireEvent.click(screen.getByTestId('pndChatsDetailPanelClose'));

      expect(history.location.search).toEqual('');
    });

    it('keeps the params the page already had when the panel closes', async () => {
      const { history } = renderPage(
        `/chats?lifecycle=ad-nested-chats&conversationId=${mockNestedIncident.id}`
      );
      await screen.findByTestId('pndChatsDetailPanel');

      fireEvent.click(screen.getByTestId('pndChatsDetailPanelClose'));

      expect(history.location.search).toEqual('?lifecycle=ad-nested-chats');
    });

    it('leaves the search control where it was', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);
      await screen.findByTestId('pndChatsDetailPanel');

      expect(screen.getByTestId('pndChatsSearch')).toBeInTheDocument();
    });

    it('lays the list out as a wrapping grid rather than a non-wrapping row', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);

      expect(await screen.findByTestId('pndChatsLayout')).toHaveClass('euiFlexGrid');
    });

    it('keeps the detail panel on that grid so it cannot overflow the chats column', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);
      const layout = await screen.findByTestId('pndChatsLayout');

      expect(layout).toContainElement(screen.getByTestId('pndChatsDetailPanel'));
    });

    it('opens the selected conversation in Agent Builder from the detail panel', async () => {
      renderPage(`/chats?conversationId=${mockNestedIncident.id}`);
      await screen.findByTestId('pndChatsDetailPanel');

      fireEvent.click(screen.getByTestId('pndChatsDetailPanelOpenInAgentBuilder'));

      expect(mockNavigateToApp).toHaveBeenCalledWith('agent_builder', {
        openInNewTab: true,
        path: `/conversations/${mockNestedIncident.id}`,
      });
    });
  });
});
