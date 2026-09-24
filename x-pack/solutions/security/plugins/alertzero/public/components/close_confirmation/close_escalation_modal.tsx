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
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from '@kbn/proposals-plugin/public';
import type { EscalationClosePreviewResponse } from '@kbn/agentic-investigations-plugin/common';
import * as i18n from './translations';

export interface CloseEscalationModalProps {
  preview: EscalationClosePreviewResponse;
  onClose: () => void;
  onConfirm: (params: { dismissReason?: DismissReason; rationale?: string }) => void;
  isLoading?: boolean;
}

/**
 * Confirmation modal shown before closing an escalation.
 *
 * Lists the open linked investigations. When any have pending proposals, prompts for a
 * dismiss reason. Otherwise shows a simpler warning about chat closure.
 */
export const CloseEscalationModal: React.FC<CloseEscalationModalProps> = ({
  preview,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');
  const [rationale, setRationale] = useState('');

  const totalPendingProposals = useMemo(
    () => preview.open_investigations.reduce((sum, inv) => sum + inv.pending_proposal_count, 0),
    [preview]
  );

  const hasProposals = totalPendingProposals > 0;
  const hasOpenInvestigations = preview.open_investigations.length > 0;

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
      confirmButtonDisabled={isLoading}
      isLoading={isLoading}
    >
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
                <li key={inv.id}>{inv.title}</li>
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
    </EuiConfirmModal>
  );
};
