/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import {
  CONVERSATION_QUEUE_CATEGORIES,
  type Investigation,
  type RecommendedAction,
} from '@kbn/alertzero-common';
import {
  ConversationQueue,
  type ConversationsActionsGroupProps,
  type BaseActionsProps,
  type CardActionType,
  InvestigationDetailsFlyout,
  InvestigationActionModals,
  BlastRadius,
} from '@kbn/agentic-investigations-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useInvestigations } from '../../hooks/use_investigations_api';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { useConversationsUrlParams } from './conversations_url_params';
import { QUEUE_PAGE_INFO } from './translations';
import { PendingProposalsPanel } from '../../components/pending_proposals';
import { usePendingProposals } from '../../hooks/use_proposals_api';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

export const ConversationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error } = useInvestigations();
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  useAlertZeroDocTitle(QUEUE_PAGE_INFO.pageTitle);

  const [selectedIdForRecommendedAction, setSelectedIdForRecommendedAction] = useState<
    string | undefined
  >(undefined);

  const {
    selectedConversationId,
    show,
    selectConversation,
    showTab,
    clearSelectedConversation,
    dismissMissingConversation,
  } = useConversationsUrlParams();
  const [modalState, setModalState] = useState<{
    type: CardActionType | null;
    recordId: Investigation['recordId'] | null;
  }>({ type: null, recordId: null });

  // TODO: update data fetching to use the new conversations API (useConversations) and remove the useInvestigations hook
  const conversations = useMemo(() => data?.investigations ?? [], [data?.investigations]);

  // The header's count comes from the proposals list API, which already returns a
  // `track_total_hits` total for the same set the queue acts on — not summed in
  // the browser, and deliberately independent of the trend chart's own query, so
  // a chart failure can neither zero the count nor hold the header in loading.
  const {
    data: pendingProposalsData,
    isLoading: isPendingProposalsLoading,
    error: pendingProposalsError,
  } = usePendingProposals();
  const proposalCount = pendingProposalsData?.total ?? 0;

  const onClickAction: BaseActionsProps['onClickAction'] = useCallback((action, recordId) => {
    setModalState({ type: action, recordId });
  }, []);

  const closeModal = useCallback(() => setModalState({ type: null, recordId: null }), []);
  const closeApproval = useCallback(() => setSelectedIdForRecommendedAction(undefined), []);

  const onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'] =
    useCallback(
      ({ id }) => {
        setSelectedIdForRecommendedAction(id);
      },
      [setSelectedIdForRecommendedAction]
    );

  const openInChat = useOpenInChat();
  const {
    services: { notifications },
  } = useKibana<CoreStart>();

  // Both params are required: an id on its own leaves the flyout closed rather than guessing a tab.
  const isFlyoutRequested = Boolean(selectedConversationId && show);

  const selectedDetailsConversation = useMemo(
    () =>
      isFlyoutRequested ? conversations.find((c) => c.id === selectedConversationId) : undefined,
    [conversations, isFlyoutRequested, selectedConversationId]
  );

  // A link to a conversation that no longer exists closes the flyout rather than leaving an empty
  // one open. Gated on `isLoading` so a background refetch cannot close a flyout that is in use.
  // Dismissed rather than closed, so Back cannot return to the bad id and warn all over again.
  useEffect(() => {
    if (!selectedConversationId || !show || isLoading || error || selectedDetailsConversation) {
      return;
    }
    notifications?.toasts.addDanger(QUEUE_PAGE_INFO.conversationNotFound(selectedConversationId));
    dismissMissingConversation();
  }, [
    dismissMissingConversation,
    error,
    isLoading,
    notifications,
    selectedConversationId,
    selectedDetailsConversation,
    show,
  ]);

  const actionInvestigation = useMemo(
    () =>
      modalState.recordId
        ? conversations.find((c) => c.recordId === modalState.recordId)
        : undefined,
    [conversations, modalState.recordId]
  );

  const selectedRecommendedActionConversation = useMemo(
    () =>
      selectedIdForRecommendedAction
        ? conversations.find((c) => c.id === selectedIdForRecommendedAction)
        : undefined,
    [conversations, selectedIdForRecommendedAction]
  );

  const sortedConversations = useMemo(
    () =>
      conversations.filter(isQueueRow).sort((a, b) => {
        const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [conversations]
  );

  const filteredQueueItems = useMemo(
    () =>
      sortedConversations.filter((conversation) => {
        if (surfaceFilter && conversation.affectedSurface !== surfaceFilter) return false;
        return true;
      }),
    [sortedConversations, surfaceFilter]
  );

  const groupedBriefingItems = useMemo(() => {
    const groups: Array<{
      id: RecommendedAction;
      label: string;
      items: Investigation[];
    }> = [];
    for (const bucket of CONVERSATION_QUEUE_CATEGORIES) {
      const items = filteredQueueItems.filter(
        (conversation) => conversation.recommendedAction === bucket.id
      );
      if (items.length >= 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filteredQueueItems]);

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          padding-block: ${euiTheme.size.xxl};
          align-self: center;
          max-width: 1000px;
        `,
      }}
    >
      {selectedConversationId && show && (
        <InvestigationDetailsFlyout
          investigation={selectedDetailsConversation}
          isLoading={isLoading}
          selectedTab={show}
          onSelectTab={showTab}
          onClose={clearSelectedConversation}
          onOpenChat={() => openInChat(selectedConversationId)}
        />
      )}

      <InvestigationActionModals
        action={modalState.type}
        recordId={modalState.recordId}
        initialAssignee={actionInvestigation?.assignee}
        approvalInvestigation={selectedRecommendedActionConversation}
        onCloseAction={closeModal}
        onCloseApproval={closeApproval}
      />

      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            // Both queries the header speaks for — the conversation queue and
            // the proposal count — so settling one while the other is in flight
            // would flash a title the next render contradicts.
            isLoading={isLoading || isPendingProposalsLoading}
            hasError={Boolean(pendingProposalsError)}
            isQueueEmpty={sortedConversations.length === 0 && proposalCount === 0}
            eventCount={proposalCount}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ProposalsTrendChartRow />
        </EuiFlexItem>
        <EuiFlexItem>
          <BlastRadius
            investigations={sortedConversations}
            surfaceFilter={surfaceFilter}
            onSurfaceFilterChange={setSurfaceFilter}
          />
        </EuiFlexItem>

        {/* Durable proposals from the investigation proposals API. Hidden when
            empty so the queue below is unaffected when nothing is pending. */}
        <EuiFlexItem grow={false}>
          <PendingProposalsPanel hideWhenEmpty />
        </EuiFlexItem>

        {isLoading ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" aria-label={QUEUE_PAGE_INFO.loading} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}

        {error ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{QUEUE_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !error && filteredQueueItems.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="chartTagCloud"
              title={<h2>{QUEUE_PAGE_INFO.emptyQueue}</h2>}
            />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !error
          ? groupedBriefingItems.map((group) => (
              <EuiFlexItem key={group.id} grow={false}>
                <ConversationQueue
                  briefingId={group.id}
                  briefingType={group.id as RecommendedAction}
                  briefingList={group.items}
                  isFiltered={filteredQueueItems.length !== sortedConversations.length}
                  onClickRecommendedAction={onClickRecommendedAction}
                  onClickAction={onClickAction}
                  onClickCard={selectConversation}
                  onOpenChat={openInChat}
                  selectedId={selectedConversationId}
                />
              </EuiFlexItem>
            ))
          : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
