/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import type { DismissReason } from '@kbn/agentic-investigations-plugin/common';
import { BaseActionModal } from '@kbn/agentic-investigations-common';
import * as i18n from './translations';

const DISMISS_REASONS: DismissReason[] = [
  'wrong',
  'duplicate',
  'insufficient_evidence',
  'low_value',
  'out_of_scope',
  'already_handled',
  'other',
];

export interface DismissProposalModalProps {
  proposalId: string;
  onClose: () => void;
  onConfirm: (params: { dismissReason: DismissReason; rationale: string }) => void;
}

/**
 * Reuses the shared action modal for the rationale field and adds the
 * structured reason, which is what the audit record and the feedback signal
 * both consume.
 */
export const DismissProposalModal: React.FC<DismissProposalModalProps> = ({
  proposalId,
  onClose,
  onConfirm,
}) => {
  const [dismissReason, setDismissReason] = useState<DismissReason>('wrong');

  return (
    <BaseActionModal
      type="dismiss"
      title={i18n.DISMISS_MODAL_TITLE}
      recordId={proposalId}
      rationalePlaceholder={i18n.DISMISS_RATIONALE_PLACEHOLDER}
      onClose={onClose}
      primaryAction={{
        color: 'danger',
        label: i18n.DISMISS,
        onClick: (rationale) => onConfirm({ dismissReason, rationale }),
      }}
    >
      <EuiFormRow fullWidth label={i18n.DISMISS_REASON_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="alertZeroDismissReasonSelect"
          value={dismissReason}
          options={DISMISS_REASONS.map((reason) => ({
            value: reason,
            text: i18n.DISMISS_REASON_LABELS[reason],
          }))}
          onChange={(event) => setDismissReason(event.target.value as DismissReason)}
        />
      </EuiFormRow>
    </BaseActionModal>
  );
};
