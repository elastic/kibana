/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  PROPOSALS_UI_CAPABILITY_SHOW,
  PROPOSALS_UI_CAPABILITY_DECIDE,
} from '@kbn/proposals-common';
import {
  type ConversationsActionsGroupProps,
  type BaseActionsProps,
  type CardActionType,
  type ImpactPill,
  type Investigation,
  InvestigationActionModals,
  type EscalationModalRenderProps,
  Impact,
  useEntityFilter,
} from '@kbn/agentic-investigations-common';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
  queryKeys as platformQueryKeys,
} from '@kbn/proposals-plugin/public';
import {
  useAssignInvestigation,
  useProposalImpactPills,
  impactPillsQueryKeys,
  useCurrentUserProfile,
  useStatusSignal,
  useOpenInChat,
  decisionErrorMessage,
  EscalationModalBoundary,
  LazyConnectedCloseInvestigationModal,
  LazyConnectedEscalationModal,
} from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { DeclineParams } from '@kbn/proposals-ui';
import { useQueueAssignees } from '../../components/connected_assignees/use_queue_assignees';
import { useAlertZeroInvestigationsCapabilities } from '../../hooks/use_alertzero_investigations_capabilities';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import {
  CLOSED_DECIDED_WITHIN_HOURS,
  CLOSED_GROUP_KEY,
  OPEN_PROPOSAL_CATEGORIES,
  type ProposalItem,
} from '../../../common/proposals/list';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import { useQueuePolling } from '../../hooks/use_queue_polling';
import { useSettlingProposalsPolling } from '../../hooks/use_settling_proposals_polling';
import { queryKeys } from '../../query_keys';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useConversationsUrlParams } from './conversations_url_params';
import { useInvestigationDetails } from './use_investigation_details';
import { useCopyInvestigationLink } from './use_copy_investigation_link';
import { COPY_LINK_TOASTS, IDLE_HEADER, QUEUE_PAGE_INFO } from './translations';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';
import { WorkersRunningPanel } from '../../components/workers_running_panel';
import { useRunningSummary } from '../../hooks/use_running_summary';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { InFlightProposalBadge } from './in_flight_proposal_badge';
import { useQueueSections } from './queue/use_queue_sections';
import { useDropDecidedProposal } from './queue/use_drop_decided_proposal';
import { QueueSection } from './queue/queue_section';
import { ScanFailureCallout } from '../../components/scan_failure_callout/scan_failure_callout';
import {
  ALERTZERO_UI_EVENTS,
  classifyError,
  useAlertZeroTelemetry,
  useReportErrorShown,
  useReportHomeOpened,
  useReportToastError,
} from '../../telemetry';

const wrapScanFailureCallout = (callout: JSX.Element) => (
  <EuiFlexItem grow={false}>{callout}</EuiFlexItem>
);

export const ConversationsPage: React.FC = () => {
  const {
    services: { application },
  } = useKibana<CoreStart>();

  if (application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_SHOW] !== true) {
    return (
      <EuiEmptyPrompt
        data-test-subj="alertzeroProposalsPrivilegesGate"
        iconType="lock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.alertzero.queue.missingProposalsPrivilegesTitle"
              defaultMessage="Contact your administrator for access"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.alertzero.queue.missingProposalsPrivilegesDescription"
              defaultMessage="To view the AlertZero queue in this space, you need the Proposed Actions Read privilege."
            />
          </p>
        }
      />
    );
  }

  return <ConversationsPageContent />;
};

const NO_PILLS: readonly ImpactPill[] = [];

const POLLED_QUERY_KEYS = [
  ...OPEN_PROPOSAL_CATEGORIES.flatMap((category) => [
    queryKeys.proposals.byCategory(category),
    queryKeys.proposals.byCategoryCount(category),
  ]),
  queryKeys.proposals.closed(),
  queryKeys.proposals.closedCount(),
  queryKeys.proposals.chartsSummaryAll(),
  impactPillsQueryKeys.proposals(),
];

const ConversationsPageContent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const queryClient = useQueryClient();
  useQueuePolling(POLLED_QUERY_KEYS);
  const { data: impactPills = NO_PILLS } = useProposalImpactPills({
    origin: ALERTZERO_PROPOSAL_ORIGIN,
    categories: OPEN_PROPOSAL_CATEGORIES,
    decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS,
  });
  const { entityFilter: effectiveEntityFilter, setEntityFilter } = useEntityFilter(impactPills);
  const {
    sections,
    proposalsById,
    investigations: conversations,
  } = useQueueSections(effectiveEntityFilter);
  useSettlingProposalsPolling(proposalsById.values());

  // When the flyout's status toggle changes status (isolated QueryClient), bump the signal
  // so this page's QueryClient invalidates its proposal queries and the queue refreshes.
  useStatusSignal(() => {
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
  });

  const { mutateAsync: approveDecision } = useApproveProposal();
  const { mutateAsync: dismissDecision } = useDismissProposal();
  const dropDecided = useDropDecidedProposal(effectiveEntityFilter);
  const { data: currentUserProfile } = useCurrentUserProfile();
  const currentActorName = currentUserProfile
    ? getUserDisplayName(currentUserProfile.user)
    : undefined;
  useAlertZeroDocTitle(QUEUE_PAGE_INFO.pageTitle);
  const { reportEvent } = useAlertZeroTelemetry();

  // The Impact entity filter is the queue's only filter today. Only setting it reports, never
  // clearing it, and its value is never reported.
  const onEntityFilterChange = useCallback(
    (next: string | null) => {
      if (next !== null && next !== effectiveEntityFilter) {
        reportEvent(ALERTZERO_UI_EVENTS.QueueFiltered, { filter_type: 'impact' });
      }
      setEntityFilter(next);
    },
    [effectiveEntityFilter, reportEvent, setEntityFilter]
  );

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

  const {
    selectedConversationId,
    selectedProposalId,
    selectConversation,
    clearSelectedConversation,
  } = useConversationsUrlParams();
  const currentProposalId =
    selectedProposalId &&
    proposalsById.get(selectedProposalId)?.conversationId === selectedConversationId
      ? selectedProposalId
      : undefined;
  const [modalState, setModalState] = useState<{
    type: CardActionType | null;
    recordId: Investigation['recordId'] | null;
  }>({ type: null, recordId: null });

  // From chartsSummary rather than the pages: no page-size cap, and every
  // category. Shares the chart row's query key, so it costs no extra request.
  const { data: chartsSummary, isLoading, isFetching, error } = useProposalChartsSummary();
  const openCount = chartsSummary?.currentOpen ?? 0;
  const runningSummary = useRunningSummary();
  // Idle: nothing open and nothing closed in the window, so the queue has no rows at all.
  // Gated on settled queries so a loading or failed count never reads as "nothing to do".
  const closedTotal = useMemo(
    () => sections.find(({ id }) => id === CLOSED_GROUP_KEY)?.total,
    [sections]
  );
  // A failed section query hides nothing but its rows, so it must not read as an empty queue,
  // and "running" is only true once an enabled Worker is confirmed.
  const hasSectionError = sections.some(
    ({ hasLoadError, hasCountError }) => hasLoadError || hasCountError
  );
  const hasEnabledWorkers = runningSummary.enabledWorkerCount > 0;
  const isIdle =
    !isLoading &&
    !error &&
    !hasSectionError &&
    hasEnabledWorkers &&
    openCount === 0 &&
    closedTotal === 0 &&
    proposalsById.size === 0;
  const hasSummaryError = Boolean(error) && chartsSummary === undefined;
  useReportHomeOpened({
    isSettled: chartsSummary !== undefined || hasSummaryError,
    openCount: chartsSummary?.currentOpen,
  });
  useReportErrorShown({
    errorClass: classifyError(error),
    isShown: hasSummaryError,
    isRefetching: isFetching,
    surface: 'queue',
  });

  const onClickAction: BaseActionsProps['onClickAction'] = useCallback((action, recordId) => {
    setModalState({ type: action, recordId });
  }, []);

  // Cards are keyed by proposal id, but the flyout addresses a conversation, so the
  // click has to be translated through the proposal's conversation.
  const onClickCard = useCallback(
    (proposalId: Investigation['id']) => {
      const conversationId = proposalsById.get(proposalId)?.conversationId;
      if (conversationId) {
        selectConversation(conversationId, proposalId);
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
    services: { application, notifications },
  } = useKibana<CoreStart>();

  const canDecide = application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] === true;
  const { manageEscalations: canManageEscalations, manageInvestigations: canManageInvestigations } =
    useAlertZeroInvestigationsCapabilities();

  // ---------------------------------------------------------------------------
  // Assignee picker — shared across all non-closed investigation cards
  // ---------------------------------------------------------------------------

  const assignInvestigation = useAssignInvestigation();

  const renderInFlightStatus = useCallback(
    ({ id, isProposalSettling }: Investigation) => (
      <InFlightProposalBadge proposalId={id} isProposalSettling={isProposalSettling} />
    ),
    []
  );

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
    buttonIconSize: 's',
  });

  // Both decisions close on success only, and surface the refusal otherwise: an expired
  // deadline or a proposal someone else already decided must not look like it landed.
  const reportQueueToastError = useReportToastError('queue');
  const onDecisionError = useMemo(
    () => (err: unknown) => {
      notifications?.toasts.addDanger(decisionErrorMessage(err));
      reportQueueToastError(classifyError(err));
    },
    [notifications, reportQueueToastError]
  );

  // The modal stays open after success. It shows the "Applied" state, so the analyst sees the
  // result before they close it.
  const confirmApproval = useCallback(
    async (proposal: ProposalItem) => {
      try {
        // Do not drop the row from the queue. An approved proposal stays in its category while its
        // action runs. The approve mutation already refetched the recorded decision.
        await approveDecision({ id: proposal.id, body: { actionInput: proposal.actionInput } });
      } catch (err) {
        onDecisionError(err);
        throw err;
      }
    },
    [approveDecision, onDecisionError]
  );

  // The approval modal collects its own decline reason inline now, so this is a direct mutation
  // call — distinct from the ⋮ "Close investigation" action below, which closes the whole
  // investigation rather than dismissing a single proposal.
  const dismissApproval = useCallback(
    async (proposal: ProposalItem, { dismissReason, rationale }: DeclineParams) => {
      try {
        await dismissDecision({ id: proposal.id, body: { dismissReason, rationale } });
        void dropDecided(proposal.id);
      } catch (err) {
        onDecisionError(err);
        throw err;
      }
    },
    [dismissDecision, dropDecided, onDecisionError]
  );

  const renderCloseModal = useCallback(
    ({ investigation, onClose }: { investigation: Investigation; onClose: () => void }) => (
      <EscalationModalBoundary>
        <LazyConnectedCloseInvestigationModal
          investigation={investigation}
          onClose={onClose}
          dropDecidedProposal={dropDecided}
        />
      </EscalationModalBoundary>
    ),
    [dropDecided]
  );

  const renderDismissModal = useCallback(
    ({ recordId, onClose }: { recordId?: string | null; onClose: () => void }) => {
      if (!recordId) return null;
      return (
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
      );
    },
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
    useCallback(({ id }) => {
      setSelectedIdForRecommendedAction(id);
    }, []);

  // Agent Builder owns the flyout: it loads the conversation and renders the slots this solution
  // registered for the `investigation` template. Closing it clears the URL, which is what closes
  // the flyout on the next pass — the URL stays the single source of truth.
  const copyInvestigationLink = useCopyInvestigationLink('queue');
  const copyInvestigationLinkFromFlyout = useCopyInvestigationLink('flyout');
  // Cards are keyed by proposal id, but the link and the flyout are keyed by its conversation.
  const copyLinkForProposal = useCallback(
    (proposalId: Investigation['id']) => {
      const conversationId = proposalsById.get(proposalId)?.conversationId;
      // The card menu closes on click, so there is no tooltip to confirm in: use a toast.
      if (conversationId && copyInvestigationLink(conversationId)) {
        notifications?.toasts.addSuccess(COPY_LINK_TOASTS.copied);
      }
    },
    [proposalsById, copyInvestigationLink, notifications]
  );
  useInvestigationDetails({
    conversationId: selectedConversationId,
    onClose: clearSelectedConversation,
    onCopyLink: copyInvestigationLinkFromFlyout,
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

  // `useDropDecidedProposal` removes a declined proposal from the open-bucket cache that
  // `proposalsById` reads. Without a fallback, `InvestigationActionModals` would close the modal
  // when the row leaves the queue, before the analyst sees the result.
  // `useProposal` keeps the single record fresh, so the sticky copy below is never old.
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
  const { data: selectedProposalData } = selectedProposalQuery;
  const selectedProposal: ProposalItem | undefined = useMemo(
    () =>
      liveSelectedProposal ??
      (stickySelectedProposal && selectedProposalData
        ? { ...stickySelectedProposal, ...selectedProposalData }
        : stickySelectedProposal),
    [liveSelectedProposal, stickySelectedProposal, selectedProposalData]
  );

  const pageContentProps = useMemo(
    () => ({
      css: css`
        padding-block: ${euiTheme.size.xxl};
        align-self: center;
        max-width: 1000px;
      `,
    }),
    [euiTheme.size.xxl]
  );

  return (
    <AlertZeroPageSection contentProps={pageContentProps}>
      <InvestigationActionModals
        action={modalState.type}
        recordId={modalState.recordId}
        initialAssignee={actionInvestigation?.assignee}
        investigation={actionInvestigation}
        approvalProposal={selectedProposal}
        readOnly={!canDecide}
        onCloseAction={closeModal}
        onCloseApproval={closeApproval}
        onConfirmApproval={confirmApproval}
        isSubmitting={isSubmittingSelected}
        currentActorName={currentActorName}
        onDismissApproval={dismissApproval}
        renderCloseModal={canManageInvestigations ? renderCloseModal : undefined}
        renderDismissModal={renderDismissModal}
        renderEscalationModal={renderEscalationModal}
      />

      {/* No `wrap`: a wrapping column sizes each line to its widest content, which let a
          long row title push the queue past the viewport instead of truncating. */}
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem grow={false}>
          <AlertZeroPageHeader
            // The header renders the charts-summary count, so it tracks that query
            // rather than the section pages, which now load independently.
            isLoading={isLoading}
            hasError={hasSummaryError}
            // Closed proposals are rows but not work: a window holding only decisions
            // already made is an empty queue, and must not read as "0 actions need you"
            // beside a populated header.
            isQueueEmpty={openCount === 0}
            eventCount={openCount}
            {...(isIdle && {
              greeting: IDLE_HEADER.greeting,
              title: IDLE_HEADER.title,
              subtitle: IDLE_HEADER.subtitle(runningSummary),
            })}
          />
        </EuiFlexItem>
        <ScanFailureCallout surface="queue" wrapper={wrapScanFailureCallout} />
        <EuiFlexItem grow={false}>
          <ProposalsTrendChartRow />
        </EuiFlexItem>
        {isIdle && (
          <EuiFlexItem grow={false}>
            <WorkersRunningPanel />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <Impact
            pills={impactPills}
            entityFilter={effectiveEntityFilter}
            onEntityFilterChange={onEntityFilterChange}
          />
        </EuiFlexItem>

        {/* Every bucket is rendered, empty or not: the accordions are the page's structure,
            so one disappearing would move the others as the queue drains. */}
        {!isIdle &&
          sections.map((section) => (
            <EuiFlexItem key={section.id} grow={false}>
              <QueueSection
                section={section}
                entityFilter={effectiveEntityFilter}
                selectedProposalId={currentProposalId}
                onClickRecommendedAction={canDecide ? onClickRecommendedAction : undefined}
                onClickAction={onClickAction}
                onClickCard={onClickCard}
                onOpenChat={openChatForProposal}
                getChatHref={getChatHrefForProposal}
                canManageEscalations={canManageEscalations}
                canCloseInvestigation={canManageInvestigations}
                onCopyLink={copyLinkForProposal}
                renderAssignees={renderAssignees}
                renderInFlightStatus={renderInFlightStatus}
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    </AlertZeroPageSection>
  );
};
