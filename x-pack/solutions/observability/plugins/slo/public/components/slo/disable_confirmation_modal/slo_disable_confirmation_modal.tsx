/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useDisableSlo } from '../../../hooks/use_disable_slo';

export interface Props {
  slo: SLOWithSummaryResponse | SLODefinitionResponse;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SloDisableConfirmationModal({ slo, onCancel, onConfirm }: Props) {
  const { mutate: disableSlo } = useDisableSlo();
  return (
    <EuiConfirmModal
      buttonColor="primary"
      data-test-subj="sloDisableConfirmationModal"
      title={i18n.translate('xpack.slo.disableConfirmationModal.title', {
        defaultMessage: 'Disable {name}?',
        values: { name: slo.name },
      })}
      cancelButtonText={i18n.translate('xpack.slo.disableConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.disableConfirmationModal.disableButtonLabel', {
        defaultMessage: 'Disable',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        disableSlo({ id: slo.id, name: slo.name });
        onConfirm();
      }}
    >
      {i18n.translate('xpack.slo.disableConfirmationModal.descriptionText', {
        defaultMessage: 'Disabling this SLO will stop generating data until it is enabled again.',
      })}
    </EuiConfirmModal>
  );
}
