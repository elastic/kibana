/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  periodDays: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SliRetentionConfirmModal({ periodDays, onCancel, onConfirm }: Props) {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.slo.globalSettings.confirmModal.title', {
        defaultMessage: 'Apply SLI retention',
      })}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      data-test-subj="sloSliRetentionConfirmModal"
      cancelButtonText={i18n.translate('xpack.slo.globalSettings.confirmModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.slo.globalSettings.confirmModal.confirmButtonLabel',
        { defaultMessage: 'Apply' }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {i18n.translate('xpack.slo.globalSettings.confirmModal.description', {
        defaultMessage:
          'SLI indices older than {periodDays} days, and their data, are deleted within 24 hours. This cannot be undone.',
        values: { periodDays },
      })}
    </EuiConfirmModal>
  );
}
