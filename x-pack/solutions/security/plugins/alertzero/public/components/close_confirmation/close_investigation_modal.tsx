/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, EuiFormRow, EuiSelect, EuiSpacer, EuiTextArea } from '@elastic/eui';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from '@kbn/proposals-plugin/public';
import * as i18n from './translations';

export interface CloseInvestigationModalProps {
  pendingProposalCount: number;
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
 */
export const CloseInvestigationModal: React.FC<CloseInvestigationModalProps> = ({
  pendingProposalCount,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
  const [rationale, setRationale] = useState('');

  const hasProposals = pendingProposalCount > 0;

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
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
    >
      {hasProposals ? (
        <>
          <p>{i18n.CLOSE_INVESTIGATION_PROPOSALS_WARNING(pendingProposalCount)}</p>
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
    </EuiConfirmModal>
  );
};
