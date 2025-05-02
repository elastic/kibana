/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLODefinitionResponse } from '@kbn/slo-schema';
import React from 'react';
import { useBulkDeleteSlo } from '../../../pages/slo_management/hooks/use_bulk_delete_slo';

export interface Props {
  onCancel: () => void;
  onConfirm: () => void;
  items: SLODefinitionResponse[];
}

export function SloBulkDeleteConfirmationModal({ items, onCancel, onConfirm }: Props) {
  const { mutate: bulkDelete } = useBulkDeleteSlo();

  return (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="sloBulkDeleteConfirmationModal"
      title={i18n.translate('xpack.slo.bulkDeleteConfirmationModal.title', {
        defaultMessage: 'Delete {count} SLOs',
        values: { count: items.length },
      })}
      cancelButtonText={i18n.translate('xpack.slo.bulkDeleteConfirmationModal.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.slo.bulkDeleteConfirmationModal.confirmButtonLabel',
        {
          defaultMessage: 'Delete',
        }
      )}
      onCancel={onCancel}
      onConfirm={() => {
        bulkDelete({ items: items.map((item) => ({ id: item.id })) });
        onConfirm();
      }}
    >
      {i18n.translate('xpack.slo.bulkDeleteConfirmationModal.descriptionText', {
        defaultMessage: 'This will delete the SLOs, their instances and all their data.',
      })}
    </EuiConfirmModal>
  );
}
