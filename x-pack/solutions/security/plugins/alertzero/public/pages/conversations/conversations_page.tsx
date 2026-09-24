/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
  AssignToUsers,
} from '@kbn/agentic-investigations-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useApproveProposal, useDismissProposal } from '@kbn/proposals-plugin/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  AGENTIC_INVESTIGATIONS_PLUGIN_ID,
  ESCALATIONS_UI_CAPABILITY_MANAGE,
  INVESTIGATIONS_UI_CAPABILITY_MANAGE,
} from '@kbn/agentic-investigations-plugin/common';
import {
  useAssignInvestigation,
  useUserProfiles,
  useSuggestUserProfiles,
} from '@kbn/agentic-investigations-plugin/public';
import { assigneeSignal } from '../../components/connected_assignees/assignee_overrides';
import { useQueryClient } from '@kbn/react-query';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
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
    services: { notifications, application },
  } = useKibana<CoreStart>();

  const canManageEscalations =
    application?.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
      ESCALATIONS_UI_CAPABILITY_MANAGE
    ] === true;

  const canManageInvestigations =
    application?.capabilities[AGENTIC_INVESTIGATIONS_PLUGIN_ID]?.[
      INVESTIGATIONS_UI_CAPABILITY_MANAGE
    ] === true;

  // ---------------------------------------------------------------------------
  // Assignee picker — shared across all non-closed investigation cards
  // ---------------------------------------------------------------------------

  const queryClient = useQueryClient();

  // Subscribe to the cross-boundary signal. Any bump (from ConnectedAssignees on the other
  // side of the React root boundary) invalidates the proposals cache and triggers a refetch,
  // which delivers fresh assignee data to all queue rows.
  const signalSnapshot = useSyncExternalStore(assigneeSignal.subscribe, assigneeSignal.getSnapshot);

  const isFirstSignalRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstSignalRenderRef.current) {
      isFirstSignalRenderRef.current = false;
      return;
    }
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
  // queryClient identity is stable; signalSnapshot reference changes only on bump.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalSnapshot]);

  // Collect every assignee UID from all investigations for a single bulk profile fetch.
  const allAssigneeUids = useMemo(() => {
    const uids = new Set<string>();
    for (const inv of conversations) {
      for (const uid of inv.assignees ?? []) {
        uids.add(uid);
      }
    }
    return Array.from(uids);
  }, [conversations]);

  const profilesQuery = useUserProfiles({ uids: allAssigneeUids });
  const profilesByUid = useMemo(() => {
    const map = new Map<string, UserProfileWithAvatar>();
    for (const profile of profilesQuery.data ?? []) {
      map.set(profile.uid, profile);
    }
    return map;
  }, [profilesQuery.data]);

  // A single search term is sufficient: only one popover can be open at a time.
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState('');
  const suggestQuery = useSuggestUserProfiles(assigneeSearchTerm, {
    size: 20,
    enabled: canManageInvestigations,
  });

  const assignInvestigation = useAssignInvestigation();

  // Optimistic state: maps investigationId → submitted-but-not-yet-confirmed selection.
  // Keyed by `investigation.id` (proposal id), which is unique per row.
  const [pendingAssignees, setPendingAssignees] = useState<Map<string, UserProfileWithAvatar[]>>(
    new Map()
  );

  const handleInvestigationAssigneesChange = useCallback(
    (investigation: Investigation, selected: UserProfileWithAvatar[]) => {
      const rowKey = investigation.id;
      const investigationId = investigation.conversationId;
      if (!investigationId) return;

      // Optimistic: show the new selection immediately.
      setPendingAssignees((prev) => new Map(prev).set(rowKey, selected));

      const assignees = selected.map((p) => p.uid);
      assignInvestigation.mutate(
        { investigationId, assignees },
        {
          onSuccess: () => {
            notifications?.toasts.addSuccess(QUEUE_PAGE_INFO.assignSuccess);
            // Signal the flyout (ConnectedAssignees) across the React root boundary so it
            // refetches its conversation immediately — without waiting for its 5 s poll.
            assigneeSignal.bump(investigationId);
            // Pending state stays until the next proposals refetch clears it.
          },
          onError: () => {
            notifications?.toasts.addDanger(QUEUE_PAGE_INFO.assignError);
            // On error the query won't refetch, so roll back the optimistic state.
            setPendingAssignees((prev) => {
              const next = new Map(prev);
              next.delete(rowKey);
              return next;
            });
          },
        }
      );
    },
    [assignInvestigation, notifications]
  );

  const renderAssignees = useCallback(
    (investigation: Investigation) => {
      const rowKey = investigation.id;
      const isUpdating = pendingAssignees.has(rowKey);

      // Prefer local pending state (optimistic) over server data while mutation is in flight.
      const baseUids = investigation.assignees ?? [];

      const selected: UserProfileWithAvatar[] = isUpdating
        ? pendingAssignees.get(rowKey) ?? []
        : baseUids.map((uid) => {
            const resolved = profilesByUid.get(uid);
            if (resolved) return resolved;
            // Synthesise a minimal profile for an unresolvable UID so it survives the
            // replace-in-full payload and can only be removed by an explicit action.
            return {
              uid,
              enabled: true,
              user: { username: uid },
              data: {},
            } as UserProfileWithAvatar;
          });

      return (
        <AssignToUsers
          conversationId={investigation.id}
          selected={selected}
          suggestions={suggestQuery.data ?? []}
          isSuggestionsLoading={suggestQuery.isLoading}
          // `isFetching` (not `isLoading`) avoids permanently disabling the button when
          // there are no assignees (React Query sets isLoading:true for disabled queries).
          isProfilesLoading={profilesQuery.isFetching}
          isUpdating={isUpdating}
          canManage={canManageInvestigations}
          onSearchChange={setAssigneeSearchTerm}
          onChange={(newSelected) => handleInvestigationAssigneesChange(investigation, newSelected)}
        />
      );
    },
    [
      pendingAssignees,
      profilesByUid,
      profilesQuery.isFetching,
      suggestQuery.data,
      suggestQuery.isLoading,
      canManageInvestigations,
      handleInvestigationAssigneesChange,
    ]
  );

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
