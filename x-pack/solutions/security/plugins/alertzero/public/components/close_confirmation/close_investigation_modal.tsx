/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from '@kbn/proposals-plugin/public';
import type { InvestigationClosePreviewResponse } from '@kbn/agentic-investigations-plugin/common';
import { PendingProposalsList } from './pending_proposals_list';
import * as i18n from './translations';

export interface CloseInvestigationModalProps {
  /**
   * The close preview data from the server. When undefined, the first fetch is still
   * in-flight; the modal shows a spinner and disables confirm until it arrives.
   */
  preview: InvestigationClosePreviewResponse | undefined;
  /** True while a background refetch is running (data may be about to change). */
  isRefreshing?: boolean;
  /** True when the server rejected the last confirm because proposals changed. */
  targetsChanged?: boolean;
  onClose: () => void;
  onConfirm: (params: { dismissReason?: DismissReason; rationale?: string }) => void;
  isLoading?: boolean;
}

/**
 * Confirmation modal shown before closing an investigation.
 *
 * When there are pending proposals, prompts for a dismiss reason and an optional
 * rationale so they can be bulk-dismissed server-side. When there are none, it is a
 * simple confirm that the investigation (and its chat) will be closed.
 *
 * While the preview is loading, a spinner is shown and confirm is disabled so the
 * user can see what they are about to dismiss before committing.
 */
export const CloseInvestigationModal: React.FC<CloseInvestigationModalProps> = ({
  preview,
  isRefreshing = false,
  targetsChanged = false,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
  const [rationale, setRationale] = useState('');

  const hasProposals = (preview?.pending_proposal_count ?? 0) > 0;
  const isConfirmDisabled = isLoading || isRefreshing || preview === undefined;

  return (
    <EuiConfirmModal
      title={i18n.CLOSE_INVESTIGATION_TITLE}
      aria-label={i18n.CLOSE_INVESTIGATION_TITLE}
      onCancel={onClose}
      onConfirm={() =>
        onConfirm(hasProposals ? { dismissReason, rationale: rationale || undefined } : {})
      }
      cancelButtonText={i18n.CANCEL_BUTTON}
      confirmButtonText={i18n.CLOSE_INVESTIGATION_BUTTON}
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
            data-test-subj="closeInvestigationTargetsChangedCallout"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {preview === undefined ? (
        <EuiLoadingSpinner size="m" data-test-subj="closeInvestigationPreviewLoading" />
      ) : (
        <>
          {hasProposals ? (
            <>
              <p>{i18n.CLOSE_INVESTIGATION_PROPOSALS_WARNING(preview.pending_proposal_count)}</p>
              <PendingProposalsList
                proposals={preview.pending_proposals}
                totalCount={preview.pending_proposal_count}
                data-test-subj="closeInvestigationProposalsList"
              />
              <EuiSpacer size="m" />
              <EuiFormRow fullWidth label={i18n.DISMISS_REASON_LABEL}>
                <EuiSelect
                  fullWidth
                  data-test-subj="closeInvestigationDismissReasonSelect"
                  value={dismissReason}
                  options={DISMISS_REASON_OPTIONS}
                  onChange={(event) => setDismissReason(event.target.value as DismissReason)}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow fullWidth label={i18n.RATIONALE_LABEL}>
                <EuiTextArea
                  fullWidth
                  data-test-subj="closeInvestigationRationaleInput"
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
