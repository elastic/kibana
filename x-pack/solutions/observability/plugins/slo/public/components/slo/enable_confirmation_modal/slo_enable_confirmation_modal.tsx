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
import { useEnableSlo } from '../../../hooks/use_enable_slo';

export interface Props {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SloEnableConfirmationModal({ slo, onCancel, onConfirm }: Props) {
  const { mutate: enableSlo } = useEnableSlo();
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="primary"
      data-test-subj="sloEnableConfirmationModal"
      title={i18n.translate('xpack.slo.enableConfirmationModal.title', {
        defaultMessage: 'Enable {name}?',
        values: { name: slo.name },
      })}
      cancelButtonText={i18n.translate('xpack.slo.enableConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.enableConfirmationModal.enableButtonLabel', {
        defaultMessage: 'Enable',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        enableSlo({ id: slo.id, name: slo.name });
        onConfirm();
      }}
    >
      {i18n.translate('xpack.slo.enableConfirmationModal.descriptionText', {
        defaultMessage: 'Enabling this SLO will generate the missing data since it was disabled.',
      })}
    </EuiConfirmModal>
  );
}
