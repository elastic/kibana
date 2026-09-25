/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from '@kbn/proposals-plugin/public';
import type { EscalationClosePreviewResponse } from '@kbn/agentic-investigations-plugin/common';
import { PendingProposalsList } from './pending_proposals_list';
import * as i18n from './translations';

export interface CloseEscalationModalProps {
  /**
   * The close preview data from the server. When undefined, the first fetch is still
   * in-flight; the modal shows a spinner and disables confirm until it arrives.
   */
  preview: EscalationClosePreviewResponse | undefined;
  /** True while a background refetch is running (data may be about to change). */
  isRefreshing?: boolean;
  /** True when the server rejected the last confirm because proposals changed. */
  targetsChanged?: boolean;
  onClose: () => void;
  onConfirm: (params: { dismissReason?: DismissReason; rationale?: string }) => void;
  isLoading?: boolean;
}

/**
 * Confirmation modal shown before closing an escalation.
 *
 * Lists the open linked investigations grouped with their pending proposals. When any
 * have pending proposals, prompts for a dismiss reason. Otherwise shows a simpler
 * warning about chat closure.
 *
 * While the preview is loading, a spinner is shown and confirm is disabled.
 */
export const CloseEscalationModal: React.FC<CloseEscalationModalProps> = ({
  preview,
  isRefreshing = false,
  targetsChanged = false,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
  const [rationale, setRationale] = useState('');

  const totalPendingProposals = useMemo(
    () =>
      (preview?.open_investigations ?? []).reduce(
        (sum, inv) => sum + inv.pending_proposal_count,
        0
      ),
    [preview]
  );

  const hasProposals = totalPendingProposals > 0;
  const hasOpenInvestigations = (preview?.open_investigations.length ?? 0) > 0;
  const isConfirmDisabled = isLoading || isRefreshing || preview === undefined;

  return (
    <EuiConfirmModal
      title={i18n.CLOSE_ESCALATION_TITLE}
      aria-label={i18n.CLOSE_ESCALATION_TITLE}
      onCancel={onClose}
      onConfirm={() =>
        onConfirm(hasProposals ? { dismissReason, rationale: rationale || undefined } : {})
      }
      cancelButtonText={i18n.CANCEL_BUTTON}
      confirmButtonText={i18n.CLOSE_ESCALATION_BUTTON}
      buttonColor="danger"
      confirmButtonDisabled={isConfirmDisabled}
      isLoading={isLoading}
    >
      {targetsChanged && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            size="s"
            title={i18n.CLOSE_TARGETS_CHANGED}
            data-test-subj="closeEscalationTargetsChangedCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {preview === undefined ? (
        <EuiLoadingSpinner size="m" data-test-subj="closeEscalationPreviewLoading" />
      ) : (
        <>
          {hasOpenInvestigations ? (
            <>
              {hasProposals ? (
                <EuiCallOut
                  announceOnMount={false}
                  color="warning"
                  size="s"
                  title={i18n.CLOSE_ESCALATION_PROPOSALS_WARNING(totalPendingProposals)}
                />
              ) : (
                <KbnInfoCallout
                  announceOnMount={false}
                  size="s"
                  title={i18n.CLOSE_ESCALATION_NO_PROPOSALS_WARNING}
                />
              )}
              <EuiSpacer size="m" />
              <EuiText size="s">
                <p>{i18n.CLOSE_ESCALATION_LINKED_INVESTIGATIONS_LABEL}</p>
                <ul>
                  {preview.open_investigations.map((inv) => (
                    <li key={inv.id}>
                      {inv.pending_proposal_count > 0
                        ? `${inv.title} — ${i18n.INVESTIGATION_PROPOSAL_COUNT(
                            inv.pending_proposal_count
                          )}`
                        : inv.title}
                      {inv.pending_proposals.length > 0 && (
                        <PendingProposalsList
                          proposals={inv.pending_proposals}
                          totalCount={inv.pending_proposal_count}
                          data-test-subj={`closeEscalationProposalsList-${inv.id}`}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </EuiText>
            </>
          ) : null}

          {hasProposals ? (
            <>
              <EuiSpacer size="m" />
              <EuiFormRow fullWidth label={i18n.DISMISS_REASON_LABEL}>
                <EuiSelect
                  fullWidth
                  data-test-subj="closeEscalationDismissReasonSelect"
                  value={dismissReason}
                  options={DISMISS_REASON_OPTIONS}
                  onChange={(event) => setDismissReason(event.target.value as DismissReason)}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth label={i18n.RATIONALE_LABEL}>
                <EuiTextArea
                  fullWidth
                  data-test-subj="closeEscalationRationaleInput"
                  placeholder={i18n.RATIONALE_PLACEHOLDER}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  rows={3}
                />
              </EuiFormRow>
            </>
          ) : null}
        </>
      )}
    </EuiConfirmModal>
  );
};
