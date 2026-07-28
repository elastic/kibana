/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/pnd-common';
import type { Proposal, ProposalStatus } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { CoverageGapChip } from './components/coverage_gap_chip';
import { ForensicEvidence } from './components/forensic_evidence';
import { InvestigationFlowDiagram } from './components/investigation_flow_diagram';
import {
  useInvestigation,
  useInvestigationProposals,
  useGenerateProposal,
} from '../../hooks/use_investigations_api';
import type { GenerateProposalProvenance } from '../../hooks/use_investigations_api';
import * as i18n from './translations';

// MVP requirement: structured dismissal reasons.
type DismissalReasonValue =
  | 'wrong'
  | 'duplicate'
  | 'insufficient_evidence'
  | 'low_value'
  | 'out_of_scope'
  | 'already_handled'
  | 'other';

const DISMISSAL_REASONS: Array<{ value: DismissalReasonValue; label: string }> = [
  { value: 'wrong', label: i18n.DISMISS_REASON_WRONG },
  { value: 'duplicate', label: i18n.DISMISS_REASON_DUPLICATE },
  { value: 'insufficient_evidence', label: i18n.DISMISS_REASON_INSUFFICIENT },
  { value: 'low_value', label: i18n.DISMISS_REASON_LOW_VALUE },
  { value: 'out_of_scope', label: i18n.DISMISS_REASON_OUT_OF_SCOPE },
  { value: 'already_handled', label: i18n.DISMISS_REASON_ALREADY_HANDLED },
  { value: 'other', label: i18n.DISMISS_REASON_OTHER },
];

// MVP requirement: users can assign a proposal to an owner. Fixed roster
// mirrors the analyst identities already used across the bundled demo data
// (real_data.ts) plus an explicit unassign option — see daybreak-requirements.md
// "Proposal Queue And Control Plane": "approve, modify, dismiss, escalate,
// assign, or defer a proposal."
const ASSIGNEE_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: 'analyst@elastic.co', label: 'analyst@elastic.co' },
  { value: 'soc-tier2@elastic.co', label: 'soc-tier2@elastic.co' },
  { value: 'forensics@elastic.co', label: 'forensics@elastic.co' },
  { value: 'maya@elastic.co', label: 'maya@elastic.co' },
  { value: null, label: i18n.ASSIGN_UNASSIGN },
];

interface ConfirmationCopy {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: 'danger' | 'primary' | 'warning';
}

// Static per-action confirmation copy — see EUI's confirm-modal guidance
// (https://eui.elastic.co/docs/containers/modal/#confirming-an-action): a
// question-framed title naming the concrete consequence, and a confirm button
// labeled with the action rather than a bare "Confirm" so a misclick on
// "Isolate endpoint" can't silently sever a live host from the network.
// `accept` branches on proposal type since "approve" means different things
// (isolate a host vs. escalate to Deep Watch vs. a plain approval).
const CONFIRMATION_COPY: Record<string, ConfirmationCopy> = {
  'accept:contain': {
    title: i18n.CONFIRM_ACCEPT_ISOLATE_TITLE,
    body: i18n.CONFIRM_ACCEPT_ISOLATE_BODY,
    confirmLabel: i18n.CONFIRM_ACCEPT_ISOLATE_CONFIRM,
    confirmColor: 'danger',
  },
  'accept:escalate': {
    title: i18n.CONFIRM_ACCEPT_ESCALATE_TITLE,
    body: i18n.CONFIRM_ACCEPT_ESCALATE_BODY,
    confirmLabel: i18n.CONFIRM_ACCEPT_ESCALATE_CONFIRM,
    confirmColor: 'primary',
  },
  accept: {
    title: i18n.CONFIRM_ACCEPT_TITLE,
    body: i18n.CONFIRM_ACCEPT_BODY,
    confirmLabel: i18n.CONFIRM_ACCEPT_CONFIRM,
    confirmColor: 'primary',
  },
  modify: {
    title: i18n.CONFIRM_MODIFY_TITLE,
    body: i18n.CONFIRM_MODIFY_BODY,
    confirmLabel: i18n.CONFIRM_MODIFY_CONFIRM,
    confirmColor: 'primary',
  },
  escalate: {
    title: i18n.CONFIRM_ESCALATE_TITLE,
    body: i18n.CONFIRM_ESCALATE_BODY,
    confirmLabel: i18n.CONFIRM_ESCALATE_CONFIRM,
    confirmColor: 'warning',
  },
  defer: {
    title: i18n.CONFIRM_DEFER_TITLE,
    body: i18n.CONFIRM_DEFER_BODY,
    confirmLabel: i18n.CONFIRM_DEFER_CONFIRM,
    confirmColor: 'primary',
  },
};

// Exported for direct unit testing of the decision-confirmation flow — see
// proposal_row_confirm.test.tsx. Not part of the page's public surface.
export const ProposalRow: React.FC<{
  proposal: Proposal;
  investigationId: string;
  onStatusChange: (proposalId: string, status: ProposalStatus) => void;
}> = ({ proposal, investigationId, onStatusChange }) => {
  const { http, notifications } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const modalTitleId = useGeneratedHtmlId({ prefix: 'pndProposalConfirmModal' });
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissOpen, setIsDismissOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  // A pending confirmation holds everything the modal needs to render + the
  // exact action/opts to run if the analyst confirms. `null` = modal closed.
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    action: 'accept' | 'dismiss' | 'modify' | 'escalate' | 'defer' | 'assign';
    opts?: { dismissalReason?: DismissalReasonValue; assignee?: string | null };
    title: string;
    body: string;
    confirmLabel: string;
    confirmColor: 'danger' | 'primary' | 'warning';
  } | null>(null);

  // Keep the approve verb consistent with the language shown on the Brief card
  // (e.g. a `contain` proposal is surfaced as "Isolate endpoint" on the queue).
  const proposalType = (proposal as { type?: string }).type;
  const approveLabel =
    proposalType === 'contain'
      ? i18n.ACTION_APPROVE_ISOLATE
      : proposalType === 'escalate'
      ? i18n.ACTION_APPROVE_ESCALATE
      : i18n.ACTION_APPROVE;

  const handleAction = async (
    action: 'accept' | 'dismiss' | 'modify' | 'escalate' | 'defer' | 'assign',
    opts?: { dismissalReason?: DismissalReasonValue; assignee?: string | null }
  ) => {
    setIsLoading(true);
    try {
      let endpoint = `/internal/pnd/investigations/${investigationId}/proposals/${proposal.id}`;
      // `assign` never changes lifecycle status — it stays/returns to `pending`
      // (ownership is a metadata mutation, not a decision transition).
      let newStatus: ProposalStatus = proposal.status;
      const body: Record<string, unknown> = {};

      if (action === 'accept') {
        endpoint = `${endpoint}/accept`;
        newStatus = 'approved';
      } else if (action === 'dismiss') {
        endpoint = `${endpoint}/reject`;
        newStatus = 'dismissed';
        // MVP requirement: dismissal reasons are structured.
        body.dismissalReason = opts?.dismissalReason ?? 'other';
      } else if (action === 'escalate') {
        endpoint = `${endpoint}/escalate`;
        newStatus = 'escalated';
      } else if (action === 'defer') {
        endpoint = `${endpoint}/defer`;
        newStatus = 'deferred';
      } else if (action === 'assign') {
        endpoint = `${endpoint}/assign`;
        newStatus = 'pending';
        body.assignee = opts?.assignee ?? null;
      } else {
        endpoint = `${endpoint}/modify`;
        newStatus = 'modified';
        body.reasoning = 'Modified by analyst review';
      }

      const result = (await http!.post(endpoint, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify(body),
      })) as {
        escalation?: { triggered?: boolean; completed?: boolean; workflowExecutionId?: string };
      };

      onStatusChange(proposal.id, newStatus);
      if (action === 'accept' && result?.escalation?.triggered) {
        notifications?.toasts.addSuccess(
          result.escalation.completed
            ? `Escalation Watch workflow completed (${result.escalation.workflowExecutionId})`
            : `Escalation Watch workflow triggered (${result.escalation.workflowExecutionId})`
        );
      } else if (action === 'assign') {
        notifications?.toasts.addSuccess(
          opts?.assignee != null ? `Assigned to ${opts.assignee}` : 'Unassigned'
        );
      } else {
        notifications?.toasts.addSuccess(`Proposal ${newStatus}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notifications?.toasts.addError(new Error(message), {
        title: `Failed to ${action} proposal`,
      });
    } finally {
      setIsLoading(false);
      setIsDismissOpen(false);
      setIsAssignOpen(false);
    }
  };

  // Every decision button below opens this confirmation instead of calling
  // handleAction directly.
  const requestConfirmation = (
    action: 'accept' | 'dismiss' | 'modify' | 'escalate' | 'defer' | 'assign',
    opts?: { dismissalReason?: DismissalReasonValue; assignee?: string | null }
  ) => {
    if (action === 'dismiss') {
      // opts.dismissalReason is always set here; dismiss only ever calls
      // requestConfirmation from a context-menu item.
      const reasonLabel =
        DISMISSAL_REASONS.find((r) => r.value === opts?.dismissalReason)?.label ??
        i18n.DISMISS_REASON_OTHER;
      setPendingConfirmation({
        action,
        opts,
        title: i18n.CONFIRM_DISMISS_TITLE(reasonLabel),
        body: i18n.CONFIRM_DISMISS_BODY,
        confirmLabel: i18n.CONFIRM_DISMISS_CONFIRM,
        confirmColor: 'danger',
      });
      return;
    }
    if (action === 'assign') {
      // opts.assignee is always set (possibly null for unassign) here; assign
      // only ever calls requestConfirmation from a context-menu item.
      setPendingConfirmation({
        action,
        opts,
        title: i18n.CONFIRM_ASSIGN_TITLE(opts?.assignee ?? null),
        body: i18n.CONFIRM_ASSIGN_BODY,
        confirmLabel: i18n.CONFIRM_ASSIGN_CONFIRM,
        confirmColor: 'primary',
      });
      return;
    }
    const entry =
      action === 'accept'
        ? CONFIRMATION_COPY[`accept:${proposalType}`] ?? CONFIRMATION_COPY.accept
        : CONFIRMATION_COPY[action];
    setPendingConfirmation({ action, opts, ...entry });
  };

  // MVP-friendly status labels — maps backend enum to analyst vocabulary.
  const statusLabels: Record<ProposalStatus, string> = {
    pending: 'Pending Decision',
    approved: 'Approved',
    modified: 'Modified',
    dismissed: 'Dismissed',
    escalated: 'Escalated',
    deferred: 'Deferred',
    executed: 'Executed',
  };

  // Theme-derived status backgrounds (no inline hex — tracks light/dark/borealis).
  const statusColors: Record<ProposalStatus, string> = {
    pending: euiTheme.colors.emptyShade,
    approved: euiTheme.colors.backgroundBaseSuccess,
    dismissed: euiTheme.colors.backgroundBaseSubdued,
    modified: euiTheme.colors.backgroundBasePrimary,
    escalated: euiTheme.colors.backgroundBaseWarning,
    deferred: euiTheme.colors.backgroundBaseSubdued,
    executed: euiTheme.colors.backgroundBaseSuccess,
  };

  // Cross-reference to the investigation this proposal was raised under. A
  // proposal on its *own* investigation carries `parentConversationId === the
  // investigation being viewed`, which would render as "linked to <the page
  // you are already on>" — noise. Only surface the breadcrumb when it points
  // somewhere the analyst can actually usefully navigate to.
  const rawParentId = (proposal as { parentConversationId?: string }).parentConversationId;
  const parentConversationId = rawParentId !== investigationId ? rawParentId : undefined;

  return (
    <EuiPanel
      paddingSize="m"
      style={{ backgroundColor: statusColors[proposal.status] }}
      data-test-subj={`pndProposalRow-${proposal.id}`}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
        <EuiFlexItem>
          <EuiText size="s">
            <p>
              <strong>
                {(proposal as any).type
                  ? `${(proposal as any).type} Proposal`
                  : (proposal as any).summary || 'Proposal'}
              </strong>
              {parentConversationId && (
                <span
                  css={css`
                    margin-left: ${euiTheme.size.s};
                    font-size: 0.8em;
                    font-weight: 400;
                    color: ${euiTheme.colors.subduedText};
                  `}
                >
                  {i18n.PROPOSAL_LINKED_TO}{' '}
                  <EuiLink
                    href={history.createHref({
                      pathname: `/investigations/${parentConversationId}`,
                    })}
                    data-test-subj={`pndProposalParentLink-${proposal.id}`}
                    onClick={(event: React.MouseEvent) => {
                      // Keep the row's own click handlers from firing, and route
                      // in-app rather than triggering a full page load. The href
                      // above is still real so middle-click / open-in-new-tab and
                      // assistive tech behave correctly.
                      event.stopPropagation();
                      event.preventDefault();
                      history.push(`/investigations/${parentConversationId}`);
                    }}
                  >
                    {parentConversationId}
                  </EuiLink>
                </span>
              )}
            </p>
            {(proposal as any).confidence && (
              <p style={{ color: '#666', fontSize: '0.9em' }}>
                Confidence: {((proposal as any).confidence * 100).toFixed(0)}%
              </p>
            )}
            <p>
              {(proposal as any).reasoning ||
                (proposal as any).recommendation ||
                'No details available'}
            </p>
            {(proposal as any).approvalRequired && (proposal as any).status === 'pending' && (
              <p
                css={css`
                  color: ${euiTheme.colors.warning};
                  font-size: 0.85em;
                  margin-top: 0.25rem;
                  font-weight: 600;
                `}
              >
                ⚠ Approval required — this proposal will not auto-execute
              </p>
            )}
            {(proposal as any).evidenceAgainst?.length > 0 && (
              <div
                css={css`
                  margin-top: 0.5rem;
                  padding: 0.5rem 0.75rem;
                  border-left: 3px solid ${euiTheme.colors.danger};
                  background: ${euiTheme.colors.backgroundBaseDanger};
                `}
              >
                <EuiText size="xs">
                  <p
                    css={css`
                      color: ${euiTheme.colors.dangerText};
                      font-weight: 600;
                      margin: 0;
                    `}
                  >
                    Evidence against:
                  </p>
                  <ul
                    css={css`
                      margin: 0.25rem 0 0 0;
                      padding-left: 1rem;
                    `}
                  >
                    {(proposal as any).evidenceAgainst.map(
                      (ev: { id: string; label: string; type?: string }) => (
                        <li key={ev.id}>
                          <span style={{ color: euiTheme.colors.dangerText }}>{ev.label}</span>
                        </li>
                      )
                    )}
                  </ul>
                </EuiText>
              </div>
            )}
            {(proposal as any).dismissalReason && (proposal as any).status === 'dismissed' && (
              <p
                css={css`
                  color: ${euiTheme.colors.subduedText};
                  font-size: 0.85em;
                  margin-top: 0.5rem;
                `}
              >
                Dismissed: <strong>{(proposal as any).dismissalReason}</strong>
              </p>
            )}
            {(proposal as any).assignee != null && (
              <p
                css={css`
                  color: ${euiTheme.colors.subduedText};
                  font-size: 0.85em;
                  margin-top: 0.5rem;
                `}
                data-test-subj={`pndProposalAssignee-${proposal.id}`}
              >
                Assigned to: <strong>{(proposal as any).assignee}</strong>
              </p>
            )}
            {proposal.status !== 'pending' && (
              <p
                css={css`
                  color: ${euiTheme.colors.subduedText};
                  font-size: 0.85em;
                  margin-top: 0.5rem;
                `}
              >
                Status: <strong>{statusLabels[proposal.status] ?? proposal.status}</strong>
              </p>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      {proposal.status === 'pending' && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="success"
                onClick={() => requestConfirmation('accept')}
                isLoading={isLoading}
                disabled={isLoading}
                data-test-subj="pndProposalApprove"
              >
                {approveLabel}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="text"
                onClick={() => requestConfirmation('modify')}
                isLoading={isLoading}
                disabled={isLoading}
                data-test-subj="pndProposalModify"
              >
                {i18n.ACTION_MODIFY}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="warning"
                onClick={() => requestConfirmation('escalate')}
                isLoading={isLoading}
                disabled={isLoading}
                data-test-subj="pndProposalEscalate"
              >
                {i18n.ACTION_ESCALATE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                color="text"
                onClick={() => requestConfirmation('defer')}
                isLoading={isLoading}
                disabled={isLoading}
                data-test-subj="pndProposalDefer"
              >
                {i18n.ACTION_DEFER}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isAssignOpen}
                closePopover={() => setIsAssignOpen(false)}
                anchorPosition="downRight"
                panelPaddingSize="none"
                button={
                  <EuiButtonEmpty
                    size="s"
                    color="text"
                    iconType="arrowDown"
                    iconSide="right"
                    onClick={() => setIsAssignOpen((o) => !o)}
                    isLoading={isLoading}
                    disabled={isLoading}
                    data-test-subj="pndProposalAssign"
                  >
                    {i18n.ACTION_ASSIGN}
                  </EuiButtonEmpty>
                }
              >
                <EuiContextMenuPanel
                  title={i18n.ASSIGN_TITLE}
                  items={ASSIGNEE_OPTIONS.map((a) => (
                    <EuiContextMenuItem
                      key={a.value ?? 'unassign'}
                      data-test-subj={`pndAssignTo-${a.value ?? 'unassign'}`}
                      onClick={() => {
                        setIsAssignOpen(false);
                        requestConfirmation('assign', { assignee: a.value });
                      }}
                    >
                      {a.label}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                isOpen={isDismissOpen}
                closePopover={() => setIsDismissOpen(false)}
                anchorPosition="downRight"
                panelPaddingSize="none"
                button={
                  <EuiButtonEmpty
                    size="s"
                    color="danger"
                    iconType="arrowDown"
                    iconSide="right"
                    onClick={() => setIsDismissOpen((o) => !o)}
                    isLoading={isLoading}
                    disabled={isLoading}
                    data-test-subj="pndProposalDismiss"
                  >
                    {i18n.ACTION_DISMISS}
                  </EuiButtonEmpty>
                }
              >
                <EuiContextMenuPanel
                  title={i18n.DISMISS_REASON_TITLE}
                  items={DISMISSAL_REASONS.map((r) => (
                    <EuiContextMenuItem
                      key={r.value}
                      data-test-subj={`pndDismissReason-${r.value}`}
                      onClick={() => {
                        setIsDismissOpen(false);
                        requestConfirmation('dismiss', { dismissalReason: r.value });
                      }}
                    >
                      {r.label}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {pendingConfirmation && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={pendingConfirmation.title}
          onCancel={() => setPendingConfirmation(null)}
          onConfirm={() => {
            const { action, opts } = pendingConfirmation;
            setPendingConfirmation(null);
            void handleAction(action, opts);
          }}
          cancelButtonText={i18n.CONFIRM_MODAL_CANCEL}
          confirmButtonText={pendingConfirmation.confirmLabel}
          buttonColor={pendingConfirmation.confirmColor}
          isLoading={isLoading}
          data-test-subj={`pndProposalConfirmModal-${pendingConfirmation.action}`}
        >
          <EuiText size="s">
            <p>{pendingConfirmation.body}</p>
          </EuiText>
        </EuiConfirmModal>
      )}
    </EuiPanel>
  );
};

export const InvestigationDetailPage: React.FC = () => {
  const { services } = useKibana();
  const history = useHistory();
  const { id, proposalId } = useParams<{ id: string; proposalId?: string }>();
  const { data, isLoading, error, refetch: refetchInvestigation } = useInvestigation(id);
  const proposalsQuery = useInvestigationProposals(id);
  const [localStatuses, setLocalStatuses] = useState<Record<string, ProposalStatus>>({});
  const [selectedTabId, setSelectedTabId] = useState('overview');
  const [generatedProposal, setGeneratedProposal] = useState<Proposal | null>(null);
  const [provenance, setProvenance] = useState<GenerateProposalProvenance | null>(null);
  const generateProposal = useGenerateProposal(id);
  usePndDocTitle(data?.investigation?.title ?? i18n.PAGE_TITLE);

  useEffect(() => {
    setLocalStatuses({});
    setSelectedTabId(proposalId ? 'proposals' : 'overview');
  }, [id, proposalId]);

  const proposals = useMemo(() => {
    return (proposalsQuery.data?.proposals ?? []).map((proposal) => ({
      ...proposal,
      status: localStatuses[proposal.id] ?? proposal.status,
    }));
  }, [localStatuses, proposalsQuery.data?.proposals]);

  useEffect(() => {
    if (!proposalId) {
      return;
    }
    const hasProposal = proposals.some((proposal) => proposal.id === proposalId);
    if (hasProposal) {
      setSelectedTabId('proposals');
    }
  }, [proposalId, proposals]);

  const onStatusChange = (nextProposalId: string, status: ProposalStatus) => {
    setLocalStatuses((current) => ({ ...current, [nextProposalId]: status }));
    services.notifications?.toasts.addSuccess(i18n.STATUS_UPDATED);
    // The decision is recorded on the investigation timeline server-side; refetch
    // so the Timeline tab reflects the analyst action without a manual reload.
    void refetchInvestigation();
  };

  const onGenerateProposal = async () => {
    try {
      const result = await generateProposal.mutateAsync();
      setGeneratedProposal(result.proposal);
      setProvenance(result.provenance);
      setSelectedTabId('proposals');
      services.notifications?.toasts.addSuccess(
        `Watch workflow proposal generated (${result.provenance.stepType})`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      services.notifications?.toasts.addError(new Error(message), {
        title: 'Failed to generate LLM proposal',
      });
    }
  };

  if (isLoading) {
    return (
      <PndPageSection>
        <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
      </PndPageSection>
    );
  }

  if (error || !data?.investigation) {
    return (
      <PndPageSection>
        <PndPageHeader title={i18n.PAGE_TITLE} backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }} />
        <EuiEmptyPrompt iconType="alert" title={<h2>{i18n.NOT_FOUND}</h2>} />
      </PndPageSection>
    );
  }

  const { investigation } = data;

  const overviewContent = (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiDescriptionList type="column" compressed columnWidths={[1, 3]}>
          <EuiDescriptionListTitle>{i18n.OVERVIEW_AFFECTED}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {investigation.affectedSurface}
          </EuiDescriptionListDescription>
          {investigation.watch_tier ? (
            <>
              <EuiDescriptionListTitle>{i18n.OVERVIEW_WATCHED_BY}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiLink
                  href={history.createHref({ pathname: `/watches/${investigation.watch_id}` })}
                  onClick={(event: React.MouseEvent) => {
                    event.preventDefault();
                    history.push(`/watches/${investigation.watch_id}`);
                  }}
                  data-test-subj="pndInvestigationSourceWatchLink"
                >
                  <EuiBadge color="hollow">{investigation.watch_tier}</EuiBadge>
                </EuiLink>
              </EuiDescriptionListDescription>
            </>
          ) : null}
          {investigation.status ? (
            <>
              <EuiDescriptionListTitle>{i18n.OVERVIEW_STATUS}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiBadge
                  color={investigation.status === 'deep-watch-complete' ? 'success' : 'default'}
                >
                  {investigation.status}
                </EuiBadge>
              </EuiDescriptionListDescription>
            </>
          ) : null}
        </EuiDescriptionList>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <p>{investigation.summary}</p>
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
      <ForensicEvidence investigationId={investigation.id} />
    </>
  );

  const proposalsContent = (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>Analyst proposals</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="sparkles"
            fill
            isLoading={generateProposal.isLoading}
            onClick={onGenerateProposal}
            data-test-subj="pndGenerateProposalButton"
          >
            Generate with LLM
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {generatedProposal && provenance ? (
        <>
          <EuiCallOut
            announceOnMount
            title={`Watch workflow · ${provenance.stepType} step · ${provenance.latencyMs}ms${
              provenance.tokenUsage ? ` · ${provenance.tokenUsage.totalTokens} tokens` : ''
            }`}
            color="primary"
            iconType="sparkles"
            size="s"
            data-test-subj="pndLlmProvenance"
          >
            <EuiText size="xs">
              This proposal was produced by a live Watch workflow (ai.agent reasoning step), not
              seed data. Execution: {provenance.workflowExecutionId}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="s" />
          <ProposalRow
            proposal={generatedProposal}
            investigationId={id}
            onStatusChange={onStatusChange}
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      {proposals.length === 0 ? (
        <EuiText>No proposals available</EuiText>
      ) : (
        proposals.map((proposal) => (
          <React.Fragment key={proposal.id}>
            <ProposalRow proposal={proposal} investigationId={id} onStatusChange={onStatusChange} />
            <EuiSpacer size="m" />
          </React.Fragment>
        ))
      )}
    </>
  );

  const timelineContent = (
    <InvestigationFlowDiagram
      investigation={investigation}
      proposals={proposals}
      onSelectProposal={(nextProposalId) => {
        setSelectedTabId('proposals');
        history.push(`/investigations/${id}/proposals/${nextProposalId}`);
      }}
    />
  );

  const tabs = [
    { id: 'overview', name: i18n.TAB_OVERVIEW, content: overviewContent },
    { id: 'proposals', name: i18n.TAB_PROPOSALS, content: proposalsContent },
    { id: 'timeline', name: i18n.TAB_TIMELINE, content: timelineContent },
  ];

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  return (
    <PndPageSection>
      <PndPageHeader
        title={investigation.title}
        subtitle={investigation.affectedSurface}
        backTo={{ path: '/', label: i18n.BACK_TO_BRIEF }}
      />
      <CoverageGapChip
        events={investigation.events}
        onClick={() => setSelectedTabId('proposals')}
      />
      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={tab.id === selectedTab.id}
            onClick={() => setSelectedTabId(tab.id)}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {selectedTab.content}
    </PndPageSection>
  );
};
