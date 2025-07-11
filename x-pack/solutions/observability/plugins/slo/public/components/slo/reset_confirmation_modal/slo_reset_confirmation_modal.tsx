/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useResetSlo } from '../../../hooks/use_reset_slo';

export interface SloResetConfirmationModalProps {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SloResetConfirmationModal({
  slo,
  onCancel,
  onConfirm,
}: SloResetConfirmationModalProps) {
  const { mutate: resetSlo } = useResetSlo();
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      data-test-subj="sloResetConfirmationModal"
      title={i18n.translate('xpack.slo.resetConfirmationModal.title', {
        defaultMessage: 'Reset {name}?',
        values: { name: slo.name },
      })}
      cancelButtonText={i18n.translate('xpack.slo.resetConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.resetConfirmationModal.resetButtonLabel', {
        defaultMessage: 'Reset',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        resetSlo({ id: slo.id, name: slo.name });
        onConfirm();
      }}
    >
      {i18n.translate('xpack.slo.resetConfirmationModal.descriptionText', {
        defaultMessage: 'Resetting this SLO will also regenerate the historical data.',
      })}
    </EuiConfirmModal>
  );
}