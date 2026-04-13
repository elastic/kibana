/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface CompositeSloDeleteModalProps {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CompositeSloDeleteModal({
  name,
  onCancel,
  onConfirm,
}: CompositeSloDeleteModalProps) {
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.slo.compositeSloList.deleteConfirmTitle', {
        defaultMessage: 'Delete "{name}"?',
        values: { name },
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate('xpack.slo.compositeSloList.deleteConfirmCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.compositeSloList.deleteConfirmButton', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      data-test-subj="compositeSloDeleteConfirmModal"
    >
      {i18n.translate('xpack.slo.compositeSloList.deleteConfirmBody', {
        defaultMessage:
          'This will permanently delete this composite SLO. The member SLOs will not be affected.',
      })}
    </EuiConfirmModal>
  );
}
