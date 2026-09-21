/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import {
  ConversationQueue,
  CONVERSATION_QUEUE_CATEGORIES,
  type ConversationsActionsGroupProps,
  type BaseActionsProps,
  type CardActionType,
  type Investigation,
  type RecommendedAction,
  InvestigationActionModals,
  BlastRadius,
} from '@kbn/agentic-investigations-common';
import { useApproveProposal, useDismissProposal } from '@kbn/agentic-investigations-plugin/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useProposalsList } from '../../hooks/use_proposals_api';
import { useUpdateAssignees } from '../../hooks/use_investigations_api';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { useConversationsUrlParams } from './conversations_url_params';
import { useInvestigationDetails } from './use_investigation_details';
import { QUEUE_PAGE_INFO, DECISION_ERRORS, ASSIGN_ERROR_MESSAGE } from './translations';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/list';
import type { ProposalItem } from '../../../common/proposals/list';
import { proposalToInvestigation } from './proposal_to_investigation';

/**
 * The proposals route distinguishes why a decision was refused — 410 the deadline passed,
 * 409 someone decided first or the action input drifted, 400 an input the action rejects.
 * The shared mutations have no `onError`, so the caller has to surface it or the dialog
 * just closes as though the decision had landed.
 */
const decisionErrorMessage = (error: unknown): string => {
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  return DECISION_ERRORS[status ?? 0] ?? DECISION_ERRORS.default;
};

export const ConversationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading, error } = useProposalsList();
  const approve = useApproveProposal();
  const dismiss = useDismissProposal();
  const updateAssignees = useUpdateAssignees();
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  useAlertZeroDocTitle(QUEUE_PAGE_INFO.pageTitle);

  const [selectedIdForRecommendedAction, setSelectedIdForRecommendedAction] = useState<
    string | undefined
  >(undefined);

  const { selectedConversationId, selectConversation, clearSelectedConversation } =
    useConversationsUrlParams();
  const [modalState, setModalState] = useState<{
    type: CardActionType | null;
    recordId: Investigation['recordId'] | null;
  }>({ type: null, recordId: null });

  // Raw proposals indexed by id so that approve can submit the original
  // actionInput without it needing a field on Investigation.
  const proposalsById = useMemo((): Map<string, ProposalItem> => {
    const all: ProposalItem[] = Object.values(data?.groups ?? {}).flat();
    return new Map(all.map((p) => [p.id, p]));
  }, [data?.groups]);

  // Adapt all proposals (including closed) into Investigation shape. The
  // adapter sets recommendedAction: 'closed' for decided ones, which routes
  // them into the Closed accordion via groupedBriefingItems below.
  const conversations = useMemo(
    () => [...proposalsById.values()].map(proposalToInvestigation),
    [proposalsById]
  );

  // Header count: pending groups only — closed proposals are excluded.
  // "3 actions need you" must not count decisions already made.
  const openCount = useMemo(
    () =>
      Object.entries(data?.groups ?? {}).reduce(
        (sum, [key, items]) => (key === CLOSED_GROUP_KEY ? sum : sum + items.length),
        0
      ),
    [data?.groups]
  );

  const onClickAction: BaseActionsProps['onClickAction'] = useCallback((action, recordId) => {
    setModalState({ type: action, recordId });
  }, []);

  // Cards are keyed by proposal id, but the flyout addresses a conversation, so the
  // click has to be translated through the proposal's conversation.
  const onClickCard = useCallback(
    (proposalId: Investigation['id']) => {
      const conversationId = proposalsById.get(proposalId)?.conversationId;
      if (conversationId) {
        selectConversation(conversationId);
      }
    },
    [proposalsById, selectConversation]
  );

  const closeModal = useCallback(() => setModalState({ type: null, recordId: null }), []);
  const closeApproval = useCallback(() => setSelectedIdForRecommendedAction(undefined), []);

  const { getChatHref, openChat } = useOpenInChat();

  // A card's chat is its investigation's Agent Builder conversation, so the proposal id the card
  // is keyed by is resolved to that conversation first. The agent id comes along on the proposal
  // because the conversation URL is scoped to the agent it belongs to.
  const getChatHrefForProposal = useCallback(
    (proposalId: Investigation['id']) => {
      const proposal = proposalsById.get(proposalId);
      return getChatHref(proposal?.conversationId, proposal?.conversationAgentId);
    },
    [getChatHref, proposalsById]
  );

  const openChatForProposal = useCallback(
    (proposalId: Investigation['id']) => {
      const proposal = proposalsById.get(proposalId);
      openChat(proposal?.conversationId, proposal?.conversationAgentId);
    },
    [openChat, proposalsById]
  );

  const {
    services: { notifications },
  } = useKibana<CoreStart>();

  // Both decisions close on success only, and surface the refusal otherwise: an expired
  // deadline or a proposal someone else already decided must not look like it landed.
  const onDecisionError = useMemo(
    () => (err: unknown) => notifications?.toasts.addDanger(decisionErrorMessage(err)),
    [notifications]
  );

  const confirmApproval = useCallback(
    (investigation: Investigation) => {
      const proposal = proposalsById.get(investigation.id);
      approve.mutate(
        { id: investigation.id, body: { actionInput: proposal?.actionInput } },
        { onSuccess: closeApproval, onError: onDecisionError }
      );
    },
    [approve, closeApproval, onDecisionError, proposalsById]
  );

  // The assign modal calls onAssign(assignee, rationale). We write the assignees list via
  // the investigations API, close on success, and surface any error as a danger toast while
  // keeping the modal open so the user can retry.
  // `modalState.recordId` carries the proposal id; the conversation id lives on the raw proposal.
  const onAssignSubmit = useCallback(
    (assignee: string) => {
      const conversationId = modalState.recordId
        ? proposalsById.get(modalState.recordId)?.conversationId
        : undefined;

      if (!conversationId) {
        notifications?.toasts.addDanger(ASSIGN_ERROR_MESSAGE);
        return;
      }

      updateAssignees.mutate(
        { id: conversationId, assignees: assignee ? [assignee] : [] },
        {
          onSuccess: closeModal,
          onError: () => notifications?.toasts.addDanger(ASSIGN_ERROR_MESSAGE),
        }
      );
    },
    [modalState.recordId, proposalsById, updateAssignees, closeModal, notifications]
  );

  const renderDismissModal = useCallback(
    ({ recordId, onClose }: { recordId: string; onClose: () => void }) => (
      <DismissProposalModal
        proposalId={recordId}
        onClose={onClose}
        onConfirm={({ dismissReason, rationale }) =>
          dismiss.mutate(
            { id: recordId, body: { dismissReason, rationale } },
            { onSuccess: onClose, onError: onDecisionError }
          )
        }
      />
    ),
    [dismiss, onDecisionError]
  );

  const onClickRecommendedAction: ConversationsActionsGroupProps['onClickRecommendedAction'] =
    useCallback(
      ({ id }) => {
        setSelectedIdForRecommendedAction(id);
      },
      [setSelectedIdForRecommendedAction]
    );

  // Agent Builder owns the flyout: it loads the conversation and renders the slots this solution
  // registered for the `investigation` template. Closing it clears the URL, which is what closes
  // the flyout on the next pass — the URL stays the single source of truth.
  useInvestigationDetails({
    conversationId: selectedConversationId,
    onClose: clearSelectedConversation,
  });

  // Which cards are current is navigation state, so it comes from the URL rather than from
  // remembering the click: opening a chat unmounts this page, and a remembered id would be
  // gone on Back while the flyout reopened from the URL. Deriving also means Close clears the
  // highlight for free.
  const selectedCardIds = useMemo(
    () =>
      selectedConversationId
        ? [...proposalsById.values()]
            .filter(({ conversationId }) => conversationId === selectedConversationId)
            .map(({ id }) => id)
        : [],
    [selectedConversationId, proposalsById]
  );

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

  // `listByWindow` sorts createdAt-ascending, which buries the proposals that matter;
  // the adapter's synthetic priorityScore is what restores an impact-first ordering.
  const sortedConversations = useMemo(
    () =>
      conversations.toSorted((a, b) => {
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

  // Every bucket is rendered, empty or not: the accordions are the page's structure, so
  // one disappearing would move the others as the queue drains.
  const groupedBriefingItems = useMemo(
    (): Array<{ id: RecommendedAction; label: string; items: Investigation[] }> =>
      CONVERSATION_QUEUE_CATEGORIES.map((bucket) => ({
        ...bucket,
        items: filteredQueueItems.filter(
          (conversation) => conversation.recommendedAction === bucket.id
        ),
      })),
    [filteredQueueItems]
  );

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
      <InvestigationActionModals
        action={modalState.type}
        recordId={modalState.recordId}
        initialAssignee={actionInvestigation?.assignees[0] ?? null}
        approvalInvestigation={selectedRecommendedActionConversation}
        onCloseAction={closeModal}
        onCloseApproval={closeApproval}
        onConfirmApproval={confirmApproval}
        onAssignSubmit={onAssignSubmit}
        renderDismissModal={renderDismissModal}
      />

      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            isLoading={isLoading}
            // Keep the count visible during a background refetch: only hide it
            // when there is an error AND no previously-loaded data to show.
            hasError={Boolean(error) && !data}
            // Closed proposals are rows but not work: a window holding only decisions
            // already made is an empty queue, and must not read as "0 actions need you"
            // beside a populated header.
            isQueueEmpty={openCount === 0}
            eventCount={openCount}
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

        {isLoading ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" aria-label={QUEUE_PAGE_INFO.loading} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}

        {error && !data ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt iconType="warning" title={<h2>{QUEUE_PAGE_INFO.loadError}</h2>} />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !(error && !data) && filteredQueueItems.length === 0 ? (
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="chartTagCloud"
              title={<h2>{QUEUE_PAGE_INFO.emptyQueue}</h2>}
            />
          </EuiFlexItem>
        ) : null}

        {!isLoading && !(error && !data)
          ? groupedBriefingItems.map((group) => (
              <EuiFlexItem key={group.id} grow={false}>
                <ConversationQueue
                  briefingId={group.id}
                  briefingType={group.id}
                  briefingList={group.items}
                  isFiltered={filteredQueueItems.length !== sortedConversations.length}
                  onClickRecommendedAction={onClickRecommendedAction}
                  onClickAction={onClickAction}
                  onClickCard={onClickCard}
                  onOpenChat={openChatForProposal}
                  getChatHref={getChatHrefForProposal}
                  selectedIds={selectedCardIds}
                />
              </EuiFlexItem>
            ))
          : null}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
