/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HttpSetup } from '@kbn/core-http-browser';
import { ApprovalContent } from '@kbn/agentic-investigations-common';
import type { ApprovalAction } from '@kbn/agentic-investigations-common';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  PROPOSAL_WITHOUT_ACTION,
  PROPOSALS_INTERNAL_URL,
  isDecided,
} from '../../../common/proposals';
import type { DismissReason, ProposalWithMetadata } from '../../../common/proposals';
import { toBlastRadiusItems } from '../attachments/to_blast_radius_items';
import { useProposalDecision } from '../hooks/use_proposal_decision';
import { ProposalDismissForm } from './proposal_dismiss_form';

type CardMode = 'view' | 'dismissing';

export interface ProposalApprovalCardProps {
  /** Initial snapshot from the attachment — used for the first render while re-reading live data. */
  proposal: ProposalWithMetadata;
  /** Proposal id from `attachment.origin ?? attachment.id`. */
  proposalId: string;
  http: HttpSetup;
}

/**
 * Inline card rendered inside the Agent Builder conversation stream when a
 * proposal attachment is encountered.
 *
 * Renders inside the framework's `EuiSplitPanel.Inner paddingSize="none"`, so
 * the card adds its own horizontal padding.
 *
 * On mount, re-reads the live proposal from the API so stale attachment
 * snapshots don't show wrong button states (silently falls back to the snapshot
 * if the request fails — both the API and the route may not exist yet pending
 * elastic/kibana#289683).
 */
export const ProposalApprovalCard = memo<ProposalApprovalCardProps>(
  ({ proposal: initialProposal, proposalId, http }) => {
    const { euiTheme } = useEuiTheme();
    const [liveProposal, setLiveProposal] = useState<ProposalWithMetadata>(initialProposal);
    const [mode, setMode] = useState<CardMode>('view');
    const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
    const [rationale, setRationale] = useState('');
    const { decisionState, approve, dismiss, reset } = useProposalDecision(http);

    // Re-read on mount so stale snapshots don't show wrong button states.
    useEffect(() => {
      http
        .get<ProposalWithMetadata>(`${PROPOSALS_INTERNAL_URL}/${proposalId}`, {
          version: AGENTIC_INVESTIGATIONS_API_VERSION,
        })
        .then(setLiveProposal)
        .catch(() => {
          // Fall back to snapshot silently (API may not exist until #289683 lands).
        });
    }, [http, proposalId]);

    // Reflect a just-made decision without a full re-fetch.
    useEffect(() => {
      if (decisionState.status === 'success') {
        setLiveProposal((prev) => ({ ...prev, ...decisionState.proposal }));
        setMode('view');
      }
    }, [decisionState]);

    const actionName =
      liveProposal.action?.name ?? liveProposal.actionWorkflowId ?? PROPOSAL_WITHOUT_ACTION;

    const isPending = liveProposal.status === 'pending';
    const isExpired = liveProposal.expired;
    const isLoading = decisionState.status === 'loading';
    const isAlreadyDecided = isDecided(liveProposal.status);

    const tone =
      liveProposal.action?.impact === 'high' || liveProposal.action?.impact === 'critical'
        ? ('danger' as const)
        : ('primary' as const);

    // --- Approve handler ---
    const handleApprove = useCallback(async () => {
      reset();
      await approve(proposalId, { actionInput: liveProposal.actionInput });
    }, [approve, liveProposal.actionInput, proposalId, reset]);

    // --- Dismiss handlers ---
    const handleDismissClick = useCallback(() => {
      reset();
      setMode('dismissing');
    }, [reset]);

    const handleDismissConfirm = useCallback(async () => {
      await dismiss(proposalId, { dismissReason, rationale: rationale || undefined });
    }, [dismiss, dismissReason, proposalId, rationale]);

    const handleDismissCancel = useCallback(() => {
      setMode('view');
      setRationale('');
      reset();
    }, [reset]);

    // --- Derive actions for ApprovalContent ---
    let primaryAction: ApprovalAction | undefined;
    let secondaryActions: ApprovalAction[] | undefined;

    if (isPending && !isAlreadyDecided) {
      if (mode === 'view') {
        primaryAction = {
          label: i18n.translate('xpack.alertzero.proposalCard.approve', {
            defaultMessage: 'Approve',
          }),
          color: 'success',
          onClick: handleApprove,
          isDisabled: isExpired || isLoading,
          isLoading,
          'data-test-subj': `alertZeroProposalApprove-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.alertzero.proposalCard.dismiss', {
              defaultMessage: 'Dismiss',
            }),
            color: 'danger',
            onClick: handleDismissClick,
            isDisabled: isExpired || isLoading,
            'data-test-subj': `alertZeroProposalDismiss-${proposalId}`,
          },
        ];
      } else {
        // mode === 'dismissing'
        primaryAction = {
          label: i18n.translate('xpack.alertzero.proposalCard.confirmDismiss', {
            defaultMessage: 'Confirm dismiss',
          }),
          color: 'danger',
          onClick: handleDismissConfirm,
          isDisabled: isLoading,
          isLoading,
          'data-test-subj': `alertZeroProposalDismissConfirm-${proposalId}`,
        };
        secondaryActions = [
          {
            label: i18n.translate('xpack.alertzero.proposalCard.cancel', {
              defaultMessage: 'Cancel',
            }),
            color: 'text',
            onClick: handleDismissCancel,
            isDisabled: isLoading,
            'data-test-subj': `alertZeroProposalDismissCancel-${proposalId}`,
          },
        ];
      }
    }
    // decided/expired → no footer (omitted entirely)

    return (
      <div
        css={css({ padding: `${euiTheme.size.m}` })}
        data-test-subj={`alertZeroProposalCard-${proposalId}`}
      >
        <ApprovalContent
          showHeader={false}
          title={actionName}
          tone={tone}
          iconType="lock"
          description={liveProposal.comment}
          blastRadius={{ variant: 'list', items: toBlastRadiusItems(liveProposal) }}
          primaryAction={primaryAction}
          secondaryActions={secondaryActions}
        >
          {/* Outcome callouts for decided/expired states */}
          {isExpired && (
            <>
              <EuiSpacer size="m" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <EuiCallOut
                  announceOnMount
                  color="warning"
                  size="s"
                  title={i18n.translate('xpack.alertzero.proposalCard.expiredCallout', {
                    defaultMessage:
                      'The decision deadline has passed. This proposal can no longer be actioned.',
                  })}
                />
              </div>
            </>
          )}
          {isAlreadyDecided && !isExpired && (
            <>
              <EuiSpacer size="m" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <EuiCallOut
                  announceOnMount
                  color="primary"
                  size="s"
                  title={i18n.translate('xpack.alertzero.proposalCard.decidedCallout', {
                    defaultMessage:
                      'This proposal has already been decided ({status}). No further action is needed.',
                    values: { status: liveProposal.status },
                  })}
                />
              </div>
            </>
          )}

          {/* Inline dismiss form */}
          {mode === 'dismissing' && (
            <>
              <EuiSpacer size="m" />
              <ProposalDismissForm
                dismissReason={dismissReason}
                rationale={rationale}
                onDismissReasonChange={setDismissReason}
                onRationaleChange={setRationale}
                data-test-subj={`alertZeroProposalDismissForm-${proposalId}`}
              />
            </>
          )}

          {/* Decision mutation error feedback */}
          {(decisionState.status === 'conflict' ||
            decisionState.status === 'expired' ||
            decisionState.status === 'error') && (
            <>
              <EuiSpacer size="s" />
              <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
                <EuiCallOut
                  announceOnMount
                  color={decisionState.status === 'conflict' ? 'warning' : 'danger'}
                  size="s"
                  title={decisionState.message}
                />
              </div>
            </>
          )}
        </ApprovalContent>
      </div>
    );
  }
);

ProposalApprovalCard.displayName = 'ProposalApprovalCard';
