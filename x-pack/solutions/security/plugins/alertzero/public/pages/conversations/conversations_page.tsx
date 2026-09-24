/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { useApproveProposal, useDismissProposal } from '@kbn/proposals-plugin/public';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useAssignInvestigation } from '@kbn/agentic-investigations-plugin/public';
import { useQueueAssignees } from '../../components/connected_assignees/use_queue_assignees';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';
import type { ProposalItem } from '../../../common/proposals/list';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useOpenInChat } from '../../hooks/use_open_in_chat';
import { useConversationsUrlParams } from './conversations_url_params';
import { useInvestigationDetails } from './use_investigation_details';
import { QUEUE_PAGE_INFO, DECISION_ERRORS } from './translations';
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
  const { sections, proposalsById, investigations: conversations } = useQueueSections();

  const approve = useApproveProposal();
  const dismiss = useDismissProposal();
  const dropDecided = useDropDecidedProposal();
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

  // From chartsSummary rather than the pages: no page-size cap, and every
  // category. Shares the chart row's query key, so it costs no extra request.
  const chartsSummary = useProposalChartsSummary();
  const openCount = chartsSummary.data?.currentOpen ?? 0;

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

  const { manageEscalations: canManageEscalations, manageInvestigations: canManageInvestigations } =
    useAgenticInvestigationsCapabilities();

  // ---------------------------------------------------------------------------
  // Assignee picker — shared across all non-closed investigation cards
  // ---------------------------------------------------------------------------

  const assignInvestigation = useAssignInvestigation();

  const renderAssignees = useQueueAssignees({
    items: conversations,
    getRowKey: (inv) => inv.id,
    getTargetId: (inv) => inv.conversationId,
    getAssigneeUids: (inv) => inv.assignees ?? [],
    assign: (investigationId, assignees) =>
      assignInvestigation.mutateAsync({ investigationId, assignees }),
    queryKey: platformQueryKeys.proposals.all,
    canManage: canManageInvestigations,
    labels: {
      assignSuccess: QUEUE_PAGE_INFO.assignSuccess,
      assignError: QUEUE_PAGE_INFO.assignError,
    },
  });

  // Both decisions close on success only, and surface the refusal otherwise: an expired
  // deadline or a proposal someone else already decided must not look like it landed.
  const onDecisionError = useMemo(
    () => (err: unknown) => notifications?.toasts.addDanger(decisionErrorMessage(err)),
    [notifications]
  );

  const confirmApproval = useCallback(
    (proposal: ProposalItem) => {
      approve.mutate(
        { id: proposal.id, body: { actionInput: proposal.actionInput } },
        {
          onSuccess: () => {
            void dropDecided(proposal.id);
            closeApproval();
          },
          onError: onDecisionError,
        }
      );
    },
    [approve, closeApproval, dropDecided, onDecisionError]
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
        onConfirm={({ dismissReason, rationale }) =>
          dismiss.mutate(
            { id: recordId, body: { dismissReason, rationale } },
            {
              onSuccess: () => {
                void dropDecided(recordId);
                onClose();
              },
              onError: onDecisionError,
            }
          )
        }
      />
    ),
    [dismiss, dropDecided, onDecisionError]
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
  const selectedProposal = selectedIdForRecommendedAction
    ? proposalsById.get(selectedIdForRecommendedAction)
    : undefined;

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
        onDismissApproval={dismissApproval}
        renderDismissModal={renderDismissModal}
        renderEscalationModal={renderEscalationModal}
      />

      <EuiFlexGroup gutterSize="l" direction="column" wrap>
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            // The header renders the charts-summary count, so it tracks that query
            // rather than the section pages, which now load independently.
            isLoading={chartsSummary.isLoading}
            hasError={Boolean(chartsSummary.error) && chartsSummary.data === undefined}
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
              renderAssignees={renderAssignees}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
