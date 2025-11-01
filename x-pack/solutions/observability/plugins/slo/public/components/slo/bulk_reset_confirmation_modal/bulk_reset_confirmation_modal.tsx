/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLODefinitionResponse } from '@kbn/slo-schema';
import { useBulkResetSlo } from '../../../pages/slo_management/hooks/use_bulk_reset_slo';

export interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  items: SLODefinitionResponse[];
}

export function SloBulkResetConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutate: bulkReset } = useBulkResetSlo({ onConfirm });
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      buttonColor="danger"
      data-test-subj="sloBulkResetConfirmationModal"
      title={i18n.translate('xpack.slo.bulkResetConfirmationModal.title', {
        defaultMessage: 'Reset {count} SLOs',
        values: { count: items.length },
      })}
      cancelButtonText={i18n.translate('xpack.slo.bulkResetConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.slo.bulkResetConfirmationModal.confirmButtonLabel', {
        defaultMessage: 'Reset',
      })}
      onCancel={onCancel}
      onConfirm={() => {
        bulkReset({ items: items.map((item) => ({ id: item.id })) });
      }}
    >
      {i18n.translate('xpack.slo.bulkResetConfirmationModal.descriptionText', {
        defaultMessage: 'This will reset the SLOs, their transforms, and all their data.',
      })}
    </EuiConfirmModal>
  );
}
