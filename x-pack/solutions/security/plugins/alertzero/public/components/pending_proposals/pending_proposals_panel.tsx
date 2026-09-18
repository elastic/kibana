/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type {
  DismissReason,
  ProposalWithMetadata,
} from '@kbn/agentic-investigations-plugin/common';
import {
  useApproveProposal,
  useDismissProposal,
  usePendingProposals,
} from '../../hooks/use_proposals_api';
import { DismissProposalModal } from './dismiss_proposal_modal';
import { ProposalDecisionCard } from './proposal_decision_card';
import * as i18n from './translations';

export interface PendingProposalsPanelProps {
  /** Scopes the list to one conversation. Omit for the whole space. */
  conversationId?: string;
  selectedProposalId?: string;
  showTitle?: boolean;
  hideWhenEmpty?: boolean;
}

/**
 * Durable proposals awaiting a decision. Approving resumes the workflow that
 * created the proposal, so the resulting action is attributed to the approver.
 */
export const PendingProposalsPanel: React.FC<PendingProposalsPanelProps> = ({
  conversationId,
  selectedProposalId,
  showTitle = true,
  hideWhenEmpty = false,
}) => {
  const { data, isLoading, error } = usePendingProposals(conversationId);
  const approve = useApproveProposal();
  const dismiss = useDismissProposal();
  const approveModalTitleId = useGeneratedHtmlId();

  const [pendingApproval, setPendingApproval] = useState<ProposalWithMetadata | undefined>();
  const [pendingDismissal, setPendingDismissal] = useState<ProposalWithMetadata | undefined>();

  const proposals = data?.proposals ?? [];
  const isBusy = approve.isLoading || dismiss.isLoading;
  const decisionFailed = approve.isError || dismiss.isError;

  const onConfirmApproval = useCallback(() => {
    if (!pendingApproval) {
      return;
    }
    // Submitting the input we rendered lets the API refuse an approval that no
    // longer matches the stored proposal.
    approve.mutate(
      {
        id: pendingApproval.id,
        body: { actionInput: pendingApproval.actionInput },
      },
      { onSettled: () => setPendingApproval(undefined) }
    );
  }, [approve, pendingApproval]);

  const onConfirmDismissal = useCallback(
    ({ dismissReason, rationale }: { dismissReason: DismissReason; rationale: string }) => {
      if (!pendingDismissal) {
        return;
      }
      dismiss.mutate(
        { id: pendingDismissal.id, body: { dismissReason, rationale } },
        { onSettled: () => setPendingDismissal(undefined) }
      );
    },
    [dismiss, pendingDismissal]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="l" aria-label={i18n.LOADING} />;
  }

  if (error) {
    return <EuiEmptyPrompt iconType="warning" title={<h3>{i18n.LOAD_ERROR}</h3>} />;
  }

  if (proposals.length === 0) {
    return hideWhenEmpty ? null : (
      <EuiText size="s" color="subdued" data-test-subj="alertZeroPendingProposalsEmpty">
        <p>{i18n.EMPTY}</p>
      </EuiText>
    );
  }

  return (
    <div data-test-subj="alertZeroPendingProposalsPanel">
      {showTitle ? (
        <>
          <EuiTitle size="xs">
            <h3>{i18n.SECTION_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      ) : null}

      {decisionFailed ? (
        <>
          <KbnDangerCallout announceOnMount title={i18n.DECISION_FAILED} />
          <EuiSpacer size="s" />
        </>
      ) : null}

      {proposals.map((proposal) => (
        <React.Fragment key={proposal.id}>
          <ProposalDecisionCard
            proposal={proposal}
            isSelected={proposal.id === selectedProposalId}
            isBusy={isBusy}
            onApprove={setPendingApproval}
            onDismiss={setPendingDismissal}
          />
          <EuiSpacer size="m" />
        </React.Fragment>
      ))}

      {pendingApproval ? (
        <EuiConfirmModal
          title={i18n.APPROVE_MODAL_TITLE}
          aria-labelledby={approveModalTitleId}
          titleProps={{ id: approveModalTitleId }}
          onCancel={() => setPendingApproval(undefined)}
          onConfirm={onConfirmApproval}
          cancelButtonText={i18n.CANCEL}
          confirmButtonText={i18n.APPROVE_CONFIRM}
          buttonColor="primary"
          isLoading={approve.isLoading}
          data-test-subj="alertZeroApproveProposalModal"
        >
          <EuiText size="s">
            <p>{pendingApproval.action?.name ?? pendingApproval.actionWorkflowId}</p>
            <p>{i18n.APPROVE_RUNS_AS_YOU}</p>
          </EuiText>
        </EuiConfirmModal>
      ) : null}

      {pendingDismissal ? (
        <DismissProposalModal
          proposalId={pendingDismissal.id}
          onClose={() => setPendingDismissal(undefined)}
          onConfirm={onConfirmDismissal}
        />
      ) : null}
    </div>
  );
};
