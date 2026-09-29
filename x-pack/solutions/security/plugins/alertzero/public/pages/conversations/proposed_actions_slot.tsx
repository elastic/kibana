/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import {
  useApproveProposal,
  useConversationProposals,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
} from '@kbn/proposals-plugin/public';
import type { ProposalWithMetadata } from '@kbn/proposals-common';
import { useCurrentUserProfile } from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ProposedActionButton } from '@kbn/agentic-investigations-common';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { decisionErrorMessage } from './decision_errors';
import {
  PROPOSED_ACTIONS_EMPTY_LABEL,
  PROPOSED_ACTIONS_LOAD_ERROR_LABEL,
  PROPOSED_ACTIONS_SHOW_MORE_LABEL,
} from './translations';

export interface ProposedActionsSlotProps {
  conversationId: string;
}

interface ProposedActionRowProps {
  proposal: ProposalWithMetadata;
  currentActorName?: string;
  onDecisionError: (err: unknown) => void;
  approve: ReturnType<typeof useApproveProposal>;
  dismiss: ReturnType<typeof useDismissProposal>;
}

/**
 * One row, split out from `ProposedActionsSlot` so `useIsApprovingProposal`/
 * `useIsDecliningProposal` — each scoped to this row's own proposal id — are called a fixed
 * number of times per render, rather than a variable number inside the list's `.map`.
 */
const ProposedActionRow = ({
  proposal,
  currentActorName,
  onDecisionError,
  approve,
  dismiss,
}: ProposedActionRowProps) => {
  const isApproving = useIsApprovingProposal(proposal.id);
  const isDeclining = useIsDecliningProposal(proposal.id);

  return (
    <EuiFlexItem>
      <ProposedActionButton
        proposal={proposal}
        isSubmitting={isApproving ? 'applying' : isDeclining ? 'declining' : undefined}
        onConfirm={async () => {
          try {
            await approve.mutateAsync({
              id: proposal.id,
              body: { actionInput: proposal.actionInput },
            });
          } catch (err) {
            onDecisionError(err);
            throw err;
          }
        }}
        onDismiss={async ({ dismissReason, rationale }) => {
          try {
            await dismiss.mutateAsync({
              id: proposal.id,
              body: { dismissReason, rationale },
            });
          } catch (err) {
            onDecisionError(err);
            throw err;
          }
        }}
        renderDismissModal={({ onClose, onConfirm }) => (
          <DismissProposalModal proposalId={proposal.id} onClose={onClose} onConfirm={onConfirm} />
        )}
        currentActorName={currentActorName}
        data-test-subj={`investigationFlyoutProposedAction-${proposal.id}`}
      />
    </EuiFlexItem>
  );
};

/**
 * `renderProposedActions` content for the investigation flyout's overview tab. Shows the whole
 * proposal history for this conversation, decided or not, so an already-applied action still
 * shows the closed record `ProposedActionButton` renders — rather than `usePendingProposals`,
 * which drops a proposal the moment it stops awaiting a human. Each row owns its own dismiss
 * modal (via `renderDismissModal`) rather than this slot sharing one, so its own "Declining"
 * badge and the modal's own submit button track the exact same mutation.
 */
export const ProposedActionsSlot = ({ conversationId }: ProposedActionsSlotProps) => {
  const {
    services: { notifications },
  } = useKibana<CoreStart>();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useConversationProposals(conversationId);
  const { data: currentUserProfile } = useCurrentUserProfile();
  const approve = useApproveProposal();
  const dismiss = useDismissProposal();

  const currentActorName = currentUserProfile
    ? getUserDisplayName(currentUserProfile.user)
    : undefined;

  const onDecisionError = useCallback(
    (err: unknown) => notifications?.toasts.addDanger(decisionErrorMessage(err)),
    [notifications]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  // Distinct from the empty state below: the API could not be reached at all, so there may be
  // proposed actions this analyst just cannot see right now — telling them "none" would be wrong.
  if (isError) {
    return <KbnDangerCallout size="s" title={PROPOSED_ACTIONS_LOAD_ERROR_LABEL} />;
  }

  // Deduplicated because the pages are offset windows over a list a decision can move rows
  // within: a proposal decided between two fetches shifts everything after it up.
  const proposals = [
    ...new Map(
      (data?.pages ?? []).flatMap((page) => page.proposals).map((p) => [p.id, p])
    ).values(),
  ];

  if (proposals.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {PROPOSED_ACTIONS_EMPTY_LABEL}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {proposals.map((proposal) => (
        <ProposedActionRow
          key={proposal.id}
          proposal={proposal}
          currentActorName={currentActorName}
          onDecisionError={onDecisionError}
          approve={approve}
          dismiss={dismiss}
        />
      ))}
      {hasNextPage && (
        <EuiFlexItem>
          <EuiButtonEmpty
            size="s"
            isLoading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            data-test-subj="investigationFlyoutProposedActionsShowMore"
          >
            {PROPOSED_ACTIONS_SHOW_MORE_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
