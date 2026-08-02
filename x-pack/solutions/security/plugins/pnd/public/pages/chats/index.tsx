/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import type { PndConversation, PndProposalRow } from '@kbn/pnd-common';

import { PndPageSection } from '../../components/layout/pnd_page_section';
import { useOpenAgentBuilderConversation } from '../../components/lifecycle_view';
import { PndPageHeader } from '../../components/pnd_page_header';
import type { QueueEvent } from '../../components/queue';
import { usePndConversations } from '../../hooks/use_pnd_conversations';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useProposals } from '../../hooks/use_proposals_api';
import { PndQueryState } from '../../states';
import { AskPndChat } from './components/ask_pnd_chat';
import { ChatDetailPanel } from './components/chat_detail_panel';
import { ChatKindGroup } from './components/chat_kind_group';
import { ConversationKpiTiles } from './components/conversation_kpi_tiles';
import { CHATS_PAGE_PER_PAGE } from './helpers/chats_page_size';
import {
  buildConversationSearch,
  clearConversationSearch,
  readConversationId,
} from './helpers/conversation_search_params';
import { conversationsFromChatGroups } from './helpers/conversations_from_chat_groups';
import { filterChatGroups } from './helpers/filter_chat_groups';
import { nestChatGroups } from './helpers/nest_chat_groups';
import { uniqueConversations } from './helpers/unique_conversations';
import * as i18n from './translations';

const flattenProposals = (
  groups: { proposals: PndProposalRow[] }[] | undefined
): PndProposalRow[] => groups?.flatMap(({ proposals }) => proposals) ?? [];

/**
 * `/chats` — two paged nested groups (incidents first, investigations below).
 *
 * Pagination is at group level via `kind` / `page` / `perPage` on
 * `GET /internal/pnd/conversations`. Nested children of the current page of
 * parents travel with that response, so nothing loads unbounded. Search stays
 * client-side on the loaded page. Filter pills are gone; four `EuiStat` tiles
 * count all chats, investigations, incidents and sub-investigations.
 *
 * This two-group-by-kind layout is PND-originated: the prototype's ChatsPage is a
 * left-nav list grouped Active/Resolved beside a case panel.
 *
 * **`?conversationId=` opens one conversation beside the list** (annotation 9b).
 * The id is resolved against the conversations already read rather than fetched.
 * An `EuiFlexGrid` rather than a non-wrapping `EuiFlexGroup` row, so the panel
 * stays in the layout when the list's min-content would otherwise push it off
 * the overflow-hidden chats column.
 */
export const ChatsPage: React.FC = () => {
  const history = useHistory();
  const { pathname, search } = useLocation();
  const [incidentPage, setIncidentPage] = useState(1);
  const [investigationPage, setInvestigationPage] = useState(1);
  const [query, setQuery] = useState('');
  const openConversation = useOpenAgentBuilderConversation();
  usePndDocTitle(i18n.PAGE_TITLE);

  const incidents = usePndConversations({
    kind: 'incident',
    page: incidentPage,
    perPage: CHATS_PAGE_PER_PAGE,
  });
  const investigations = usePndConversations({
    kind: 'investigation',
    page: investigationPage,
    perPage: CHATS_PAGE_PER_PAGE,
  });
  const proposalsQuery = useProposals();

  const proposals = useMemo(
    () => flattenProposals(proposalsQuery.data?.proposals.groups),
    [proposalsQuery.data?.proposals.groups]
  );

  const incidentGroups = useMemo(
    () =>
      nestChatGroups({
        conversations: incidents.data?.conversations ?? [],
        kind: 'incident',
        proposals,
      }),
    [incidents.data?.conversations, proposals]
  );
  const investigationGroups = useMemo(
    () =>
      nestChatGroups({
        conversations: investigations.data?.conversations ?? [],
        kind: 'investigation',
        proposals,
      }),
    [investigations.data?.conversations, proposals]
  );

  const visibleIncidentGroups = useMemo(
    () => filterChatGroups({ groups: incidentGroups, query }),
    [incidentGroups, query]
  );
  const visibleInvestigationGroups = useMemo(
    () => filterChatGroups({ groups: investigationGroups, query }),
    [investigationGroups, query]
  );

  const incidentTotal = incidents.data?.total ?? 0;
  const investigationTotal = investigations.data?.total ?? 0;
  const loadedConversations = useMemo(
    (): PndConversation[] => [
      ...(incidents.data?.conversations ?? []),
      ...(investigations.data?.conversations ?? []),
    ],
    [incidents.data?.conversations, investigations.data?.conversations]
  );

  const selectedConversationId = readConversationId(search);
  const selectedConversation = useMemo(
    () => loadedConversations.find(({ id }) => id === selectedConversationId),
    [loadedConversations, selectedConversationId]
  );

  const onRetry = useCallback(() => {
    void incidents.refetch();
    void investigations.refetch();
  }, [incidents, investigations]);

  const onCloseDetails = useCallback(() => {
    history.replace({ pathname, search: clearConversationSearch(search) });
  }, [history, pathname, search]);

  const onSelectConversation = useCallback(
    (conversationId: string) => {
      history.replace({ pathname, search: buildConversationSearch(search, conversationId) });
    },
    [history, pathname, search]
  );

  const onChildApprovalRequest = useCallback(
    (event: QueueEvent) => {
      openConversation(event.threadConversationId ?? event.id);
    },
    [openConversation]
  );

  const uniqueLoaded = useMemo(
    () => uniqueConversations(loadedConversations),
    [loadedConversations]
  );
  const countedConversations = useMemo(
    () =>
      conversationsFromChatGroups({
        conversations: uniqueLoaded,
        groups: [...visibleIncidentGroups, ...visibleInvestigationGroups],
      }),
    [uniqueLoaded, visibleIncidentGroups, visibleInvestigationGroups]
  );
  const isFilterActive = query.trim().length > 0;
  const visibleCount = visibleIncidentGroups.length + visibleInvestigationGroups.length;
  const hasAny = incidentTotal + investigationTotal > 0;

  return (
    <PndPageSection>
      <PndPageHeader subtitle={i18n.PAGE_SUBTITLE} title={i18n.PAGE_TITLE} />

      <PndQueryState
        emptyBody={i18n.EMPTY_BODY}
        emptyTitle={i18n.EMPTY_TITLE}
        error={incidents.error ?? investigations.error}
        isEmpty={!hasAny}
        isLoading={incidents.isLoading || investigations.isLoading}
        loadingLabel={i18n.LOADING_CONVERSATIONS}
        onRetry={onRetry}
      >
        <EuiFlexGrid
          alignItems="start"
          columns={selectedConversation != null ? 2 : 1}
          data-test-subj="pndChatsLayout"
          gutterSize="m"
        >
          <EuiFlexItem css={{ minInlineSize: 0 }}>
            <EuiFieldSearch
              aria-label={i18n.SEARCH_ARIA_LABEL}
              data-test-subj="pndChatsSearch"
              fullWidth
              onChange={(event) => setQuery(event.target.value)}
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={query}
            />

            <EuiSpacer size="m" />

            <div data-test-subj="pndChatsKpiSlot">
              <ConversationKpiTiles
                conversations={countedConversations}
                isFilterActive={isFilterActive}
              />
            </div>

            <EuiSpacer size="m" />

            {hasAny && visibleCount === 0 ? (
              <EuiEmptyPrompt
                body={<p>{i18n.NO_MATCHES_BODY}</p>}
                data-test-subj="pndChatsNoMatches"
                iconType="filter"
                title={<h2>{i18n.NO_MATCHES_TITLE}</h2>}
                titleSize="xs"
              />
            ) : (
              <EuiFlexGroup direction="column" gutterSize="l">
                <EuiFlexItem grow={false}>
                  <ChatKindGroup
                    groups={visibleIncidentGroups}
                    label={i18n.INCIDENTS_SECTION_TITLE}
                    onChildApprovalRequest={onChildApprovalRequest}
                    onOpenChat={openConversation}
                    onOpenParent={onSelectConversation}
                    onPageClick={setIncidentPage}
                    onSelectChild={onSelectConversation}
                    page={incidentPage}
                    paginationAriaLabel={i18n.INCIDENTS_PAGINATION_ARIA_LABEL}
                    sectionId="incident"
                    selectedConversationId={selectedConversationId}
                    total={incidentTotal}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ChatKindGroup
                    groups={visibleInvestigationGroups}
                    label={i18n.INVESTIGATIONS_SECTION_TITLE}
                    onChildApprovalRequest={onChildApprovalRequest}
                    onOpenChat={openConversation}
                    onOpenParent={onSelectConversation}
                    onPageClick={setInvestigationPage}
                    onSelectChild={onSelectConversation}
                    page={investigationPage}
                    paginationAriaLabel={i18n.INVESTIGATIONS_PAGINATION_ARIA_LABEL}
                    sectionId="investigation"
                    selectedConversationId={selectedConversationId}
                    total={investigationTotal}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>

          {selectedConversation != null ? (
            <EuiFlexItem css={{ minInlineSize: 0 }}>
              <ChatDetailPanel conversation={selectedConversation} onClose={onCloseDetails} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGrid>
      </PndQueryState>

      <EuiSpacer size="l" />

      <AskPndChat />
    </PndPageSection>
  );
};
