/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import {
  useApproveProposal,
  useConversationProposals,
  useDismissProposal,
} from '@kbn/proposals-plugin/public';
import { useCurrentUserProfile } from '@kbn/agentic-investigations-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ProposedActionButton } from '@kbn/agentic-investigations-common';
import { DismissProposalModal } from '../../components/pending_proposals/dismiss_proposal_modal';
import { decisionErrorMessage } from './decision_errors';
import { PROPOSED_ACTIONS_EMPTY_LABEL } from './translations';

export interface ProposedActionsSlotProps {
  conversationId: string;
}

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
  const { data, isLoading } = useConversationProposals(conversationId);
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

  const proposals = data?.proposals ?? [];

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
        <EuiFlexItem key={proposal.id}>
          <ProposedActionButton
            proposal={proposal}
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
              <DismissProposalModal
                proposalId={proposal.id}
                onClose={onClose}
                onConfirm={onConfirm}
              />
            )}
            currentActorName={currentActorName}
            data-test-subj={`investigationFlyoutProposedAction-${proposal.id}`}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
