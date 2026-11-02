/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { css } from '@emotion/react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { PROPOSALS_UI_CAPABILITY_SHOW } from '@kbn/proposals-common';
import {
  type BaseActionsProps,
  type CardActionType,
  type Investigation,
  InvestigationActionModals,
  type EscalationModalRenderProps,
  Impact,
  useEntityFilter,
} from '@kbn/agentic-investigations-common';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import {
  useAssignInvestigation,
  useSetInvestigationStatus,
  useProposalImpactPills,
  impactPillsQueryKeys,
  useStatusSignal,
  useOpenInChat,
  EscalationModalBoundary,
  LazyConnectedCloseInvestigationModal,
  LazyConnectedEscalationModal,
} from '@kbn/agentic-investigations-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useQueueAssignees } from '../../components/connected_assignees/use_queue_assignees';
import { useAlertZeroInvestigationsCapabilities } from '../../hooks/use_alertzero_investigations_capabilities';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../common/proposals/origin';
import {
  CLOSED_DECIDED_WITHIN_HOURS,
  CLOSED_GROUP_KEY,
  OPEN_PROPOSAL_CATEGORIES,
} from '../../../common/proposals/list';
import { useProposalChartsSummary } from '../../hooks/use_proposal_charts_summary';
import { useQueuePolling } from '../../hooks/use_queue_polling';
import { useSettlingProposalsPolling } from '../../hooks/use_settling_proposals_polling';
import { queryKeys } from '../../query_keys';
import { AlertZeroPageSection } from '../../components/layout/alertzero_page_section';
import { ALERTZERO_PAGE_CONTENT_WIDTH } from '../../components/layout/constants';
import { AlertZeroPageHeader } from '../../components/alertzero_page_header';
import { useAlertZeroDocTitle } from '../../hooks/use_alertzero_doc_title';
import { useConversationsUrlParams } from './conversations_url_params';
import { useInvestigationDetails } from './use_investigation_details';
import { useCopyInvestigationLink } from './use_copy_investigation_link';
import {
  AGENT_BUILDER_PRIVILEGE_REQUIRED,
  COPY_LINK_TOASTS,
  IDLE_HEADER,
  QUEUE_PAGE_INFO,
} from './translations';
import { ProposalsTrendChartRow } from '../../components/proposals_trend_chart';
import { WorkersRunningPanel } from '../../components/workers_running_panel';
import { useRunningSummary } from '../../hooks/use_running_summary';
import { InFlightProposalBadge } from './in_flight_proposal_badge';
import { useQueueSections } from './queue/use_queue_sections';
import { useDropDecidedProposal } from './queue/use_drop_decided_proposal';
import { QueueSection } from './queue/queue_section';
import { AgentBuilderPrivilegeCallout } from '../../components/agent_builder_privilege_callout/agent_builder_privilege_callout';
import { ScanFailureCallout } from '../../components/scan_failure_callout/scan_failure_callout';
import {
  ALERTZERO_UI_EVENTS,
  classifyError,
  useAlertZeroTelemetry,
  useReportErrorShown,
  useReportHomeOpened,
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

const POLLED_QUERY_KEYS = [
  ...OPEN_PROPOSAL_CATEGORIES.flatMap((category) => [
    queryKeys.proposals.byCategory(category),
    queryKeys.proposals.byCategoryCount(category),
  ]),
  queryKeys.proposals.closed(),
  queryKeys.proposals.closedCount(),
  queryKeys.proposals.chartsSummaryAll(),
];

/** Pills load a page at a time and re-rank as a whole, so a poll refreshes every loaded page. */
const POLLED_ALL_PAGES_QUERY_KEYS = [impactPillsQueryKeys.proposals()];

const ConversationsPageContent: React.FC = () => {
  const queryClient = useQueryClient();
  useQueuePolling(POLLED_QUERY_KEYS, POLLED_ALL_PAGES_QUERY_KEYS);
  // Impact pills and the entity filter go through the investigations impact client, which needs
  // Agentic Investigations Read. Without it the request is skipped and a callout explains why.
  const { readInvestigations: canReadInvestigations } = useAlertZeroInvestigationsCapabilities();
  const impactPills = useProposalImpactPills({
    origin: ALERTZERO_PROPOSAL_ORIGIN,
    categories: OPEN_PROPOSAL_CATEGORIES,
    decidedWithinHours: CLOSED_DECIDED_WITHIN_HOURS,
    enabled: canReadInvestigations,
  });
  const {
    entityFilter: effectiveEntityFilter,
    selectedPill,
    setEntityFilter,
  } = useEntityFilter(impactPills);
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

  const dropDecided = useDropDecidedProposal(effectiveEntityFilter);
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

  const { mutateAsync: setInvestigationStatus } = useSetInvestigationStatus();

  // Reopening needs no confirmation: unlike closing, it dismisses nothing.
  const reopenInvestigation = useCallback(
    async (recordId: Investigation['recordId']) => {
      const conversationId = conversations.find((c) => c.recordId === recordId)?.conversationId;
      if (!conversationId) return;
      try {
        await setInvestigationStatus({
          investigationId: conversationId,
          body: { status: 'open' },
        });
        notifications?.toasts.addSuccess(QUEUE_PAGE_INFO.reopenSuccess);
        void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
      } catch {
        notifications?.toasts.addDanger(QUEUE_PAGE_INFO.reopenError);
      }
    },
    [conversations, notifications, queryClient, setInvestigationStatus]
  );

  const onClickAction: BaseActionsProps['onClickAction'] = useCallback(
    (action, recordId) => {
      if (action === 'reopen') {
        void reopenInvestigation(recordId);
        return;
      }
      setModalState({ type: action, recordId });
    },
    [reopenInvestigation]
  );

  const {
    manageEscalations: canManageEscalations,
    manageInvestigations: canManageInvestigations,
    canAccessAgentBuilder,
  } = useAlertZeroInvestigationsCapabilities();

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

  const renderEscalationModal = useCallback(
    (props: EscalationModalRenderProps) => (
      <EscalationModalBoundary>
        <LazyConnectedEscalationModal {...props} />
      </EscalationModalBoundary>
    ),
    []
  );

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
    conversationId: canAccessAgentBuilder ? selectedConversationId : undefined,
    onClose: clearSelectedConversation,
    onCopyLink: copyInvestigationLinkFromFlyout,
  });
  useEffect(() => {
    if (selectedConversationId && !canAccessAgentBuilder) {
      notifications?.toasts.addWarning(AGENT_BUILDER_PRIVILEGE_REQUIRED.toast);
      clearSelectedConversation();
    }
  }, [selectedConversationId, canAccessAgentBuilder, notifications, clearSelectedConversation]);

  const actionInvestigation = useMemo(
    () =>
      modalState.recordId
        ? conversations.find((c) => c.recordId === modalState.recordId)
        : undefined,
    [conversations, modalState.recordId]
  );

  return (
    <AlertZeroPageSection
      contentProps={{
        css: css`
          width: ${ALERTZERO_PAGE_CONTENT_WIDTH}px;
          max-width: 100%;
          margin-inline: auto;
        `,
      }}
    >
      <InvestigationActionModals
        action={modalState.type}
        investigation={actionInvestigation}
        onCloseAction={closeModal}
        renderCloseModal={canManageInvestigations ? renderCloseModal : undefined}
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
        {!canAccessAgentBuilder && (
          <EuiFlexItem grow={false}>
            <AgentBuilderPrivilegeCallout />
          </EuiFlexItem>
        )}
        <ScanFailureCallout surface="queue" wrapper={wrapScanFailureCallout} />
        <EuiFlexItem grow={false}>
          <ProposalsTrendChartRow />
        </EuiFlexItem>
        {isIdle && (
          <EuiFlexItem grow={false}>
            <WorkersRunningPanel />
          </EuiFlexItem>
        )}
        {canReadInvestigations ? (
          <EuiFlexItem>
            <Impact
              impact={impactPills}
              selectedPill={selectedPill}
              entityFilter={effectiveEntityFilter}
              onEntityFilterChange={onEntityFilterChange}
            />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false}>
            <KbnWarningCallout
              announceOnMount
              data-test-subj="alertzeroInvestigationsReadGate"
              size="s"
              title={
                <FormattedMessage
                  id="xpack.alertzero.queue.missingInvestigationsReadTitle"
                  defaultMessage="Impacted entities are unavailable"
                />
              }
            >
              <FormattedMessage
                id="xpack.alertzero.queue.missingInvestigationsReadDescription"
                defaultMessage="To see impacted entities and filter the queue by entity, you need the Agentic Investigations Read privilege."
              />
            </KbnWarningCallout>
          </EuiFlexItem>
        )}

        {/* Every bucket is rendered, empty or not: the accordions are the page's structure,
            so one disappearing would move the others as the queue drains. */}
        {!isIdle &&
          sections.map((section) => (
            <EuiFlexItem key={section.id} grow={false}>
              <QueueSection
                section={section}
                entityFilter={effectiveEntityFilter}
                selectedProposalId={currentProposalId}
                onClickAction={onClickAction}
                onClickCard={onClickCard}
                onOpenChat={openChatForProposal}
                canOpenInvestigationDetails={canAccessAgentBuilder}
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
