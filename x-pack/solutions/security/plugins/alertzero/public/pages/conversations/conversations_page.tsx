/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import {
  type ConversationsActionsGroupProps,
  type BaseActionsProps,
  type CardActionType,
  type Investigation,
  InvestigationActionModals,
  type EscalationModalRenderProps,
  Impact,
} from '@kbn/agentic-investigations-common';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
} from '@kbn/proposals-plugin/public';
import { useCurrentUserProfile } from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
} from '@kbn/agentic-investigations-plugin/common';
import type { ProposalItem } from '../../../common/proposals/list';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { useConversationsUrlParams } from './conversations_url_params';
import { useInvestigationDetails } from './use_investigation_details';
import { QUEUE_PAGE_INFO } from './translations';
import { decisionErrorMessage } from './decision_errors';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { EscalationModalBoundary } from './escalation_modal_boundary';
import { useQueueSections } from './queue/use_queue_sections';
import { useDropDecidedProposal } from './queue/use_drop_decided_proposal';
import { QueueSection } from './queue/queue_section';

// Lazy-loaded so that the escalation modal tree (React Query hooks, form components,
// translations, and user-profile API) stays out of alertzero's main chunk.
const LazyConnectedEscalationModal = React.lazy(() =>
  import('./connected_escalation_modal').then((m) => ({ default: m.ConnectedEscalationModal }))
);

export const ConversationsPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { sections, proposalsById, investigations: conversations } = useQueueSections();

  // FIXME: use hook methods to keep in-flight states
  const { mutateAsync: approveDecision } = useApproveProposal();
  const { mutateAsync: dismissDecision } = useDismissProposal();
  const dropDecided = useDropDecidedProposal();
  const { data: currentUserProfile } = useCurrentUserProfile();
  const currentActorName = currentUserProfile
    ? getUserDisplayName(currentUserProfile.user)
    : undefined;
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  useAlertZeroDocTitle(QUEUE_PAGE_INFO.pageTitle);

  const [selectedIdForRecommendedAction, setSelectedIdForRecommendedAction] = useState<
    string | undefined
  >(undefined);
  const isApprovingSelected = useIsApprovingProposal(selectedIdForRecommendedAction);
  const isDecliningSelected = useIsDecliningProposal(selectedIdForRecommendedAction);
  const isSubmittingSelected = isApprovingSelected
    ? 'applying'
    : isDecliningSelected
    ? 'declining'
    : undefined;

  const { selectedConversationId, selectConversation, clearSelectedConversation } =
    useConversationsUrlParams();
  const [modalState, setModalState] = useState<{
    type: CardActionType | null;
    recordId: Investigation['recordId'] | null;
  }>({ type: null, recordId: null });

  // From chartsSummary rather than the pages: no page-size cap, and every
  // category. Shares the chart row's query key, so it costs no extra request.
  const { data: chartsSummary, isLoading, error } = useProposalChartsSummary();
  const openCount = chartsSummary?.currentOpen ?? 0;

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
    services: { notifications, application },
  } = useKibana<CoreStart>();

  const canManageEscalations =
    application?.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
      ESCALATIONS_UI_CAPABILITY_MANAGE
    ] === true;

  // Both decisions close on success only, and surface the refusal otherwise: an expired
  // deadline or a proposal someone else already decided must not look like it landed.
  const onDecisionError = useMemo(
    () => (err: unknown) => notifications?.toasts.addDanger(decisionErrorMessage(err)),
    [notifications]
  );

  // Stays open on success rather than closing: the approval modal itself shows the resulting
  // "Applied" state, so the analyst sees the outcome before dismissing it themselves.
  const confirmApproval = useCallback(
    async (proposal: ProposalItem) => {
      try {
        await approveDecision({ id: proposal.id, body: { actionInput: proposal.actionInput } });
        void dropDecided(proposal.id);
      } catch (err) {
        onDecisionError(err);
        throw err;
      }
    },
    [approveDecision, dropDecided, onDecisionError]
  );

  // Dismissing is a decision with a reason, so the approval modal hands off to the dismiss
  // modal the ⋮ menu already opens rather than growing a second form of its own.
  const dismissApproval = useCallback(
    (proposal: ProposalItem) => {
      closeApproval();
      setModalState({ type: 'close', recordId: proposal.id });
    },
    [closeApproval]
  );

  const renderDismissModal = useCallback(
    ({ recordId, onClose }: { recordId: string; onClose: () => void }) => (
      <DismissProposalModal
        proposalId={recordId}
        onClose={onClose}
        onConfirm={async ({ dismissReason, rationale }) => {
          try {
            await dismissDecision({ id: recordId, body: { dismissReason, rationale } });
            void dropDecided(recordId);
            onClose();
          } catch (err) {
            onDecisionError(err);
            throw err;
          }
        }}
      />
    ),
    [dismissDecision, dropDecided, onDecisionError]
  );

  const renderEscalationModal = useCallback(
    (props: EscalationModalRenderProps) => (
      <EscalationModalBoundary>
        <LazyConnectedEscalationModal {...props} />
      </EscalationModalBoundary>
    ),
    []
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

  const actionInvestigation = useMemo(
    () =>
      modalState.recordId
        ? conversations.find((c) => c.recordId === modalState.recordId)
        : undefined,
    [conversations, modalState.recordId]
  );

  // Cards are keyed by proposal id, so the click already names the row the modal decides on.
  const liveSelectedProposal = selectedIdForRecommendedAction
    ? proposalsById.get(selectedIdForRecommendedAction)
    : undefined;

  // `useDropDecidedProposal` removes a just-decided proposal from the open-bucket cache
  // `proposalsById` is built from, before the analyst has necessarily seen the approval modal
  // reflect it. Without this, `InvestigationActionModals` would unmount the modal the instant
  // the row leaves the queue, right when `Applying`/`Applied` is shown.
  // `useProposal` keeps refreshing the single record independently of that eviction (including
  // through the settling window), so the sticky fallback below stays live rather than frozen
  // pre-decision.
  const [stickySelectedProposal, setStickySelectedProposal] = useState<ProposalItem | undefined>(
    undefined
  );
  useEffect(() => {
    if (liveSelectedProposal) {
      setStickySelectedProposal(liveSelectedProposal);
    }
  }, [liveSelectedProposal]);
  useEffect(() => {
    if (!selectedIdForRecommendedAction) {
      setStickySelectedProposal(undefined);
    }
  }, [selectedIdForRecommendedAction]);

  const selectedProposalQuery = useProposal(selectedIdForRecommendedAction);
  const selectedProposal: ProposalItem | undefined =
    liveSelectedProposal ??
    (stickySelectedProposal && selectedProposalQuery.data
      ? { ...stickySelectedProposal, ...selectedProposalQuery.data }
      : stickySelectedProposal);

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
        initialAssignee={actionInvestigation?.assignee}
        investigation={actionInvestigation}
        approvalProposal={selectedProposal}
        onCloseAction={closeModal}
        onCloseApproval={closeApproval}
        onConfirmApproval={confirmApproval}
        isSubmitting={isSubmittingSelected}
        currentActorName={currentActorName}
        onDismissApproval={dismissApproval}
        renderDismissModal={renderDismissModal}
        renderEscalationModal={renderEscalationModal}
      />

      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            // The header renders the charts-summary count, so it tracks that query
            // rather than the section pages, which now load independently.
            isLoading={isLoading}
            hasError={Boolean(error) && chartsSummary === undefined}
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
          <Impact
            investigations={conversations}
            surfaceFilter={surfaceFilter}
            onSurfaceFilterChange={setSurfaceFilter}
          />
        </EuiFlexItem>

        {/* Every bucket is rendered, empty or not: the accordions are the page's structure,
            so one disappearing would move the others as the queue drains. */}
        {sections.map((section) => (
          <EuiFlexItem key={section.id} grow={false}>
            <QueueSection
              section={section}
              surfaceFilter={surfaceFilter}
              selectedConversationId={selectedConversationId}
              onClickRecommendedAction={onClickRecommendedAction}
              onClickAction={onClickAction}
              onClickCard={onClickCard}
              onOpenChat={openChatForProposal}
              getChatHref={getChatHrefForProposal}
              canManageEscalations={canManageEscalations}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
