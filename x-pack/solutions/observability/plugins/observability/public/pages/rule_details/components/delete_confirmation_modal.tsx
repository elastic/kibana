/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeleteRules } from '../../../hooks/use_delete_rules';

interface DeleteConfirmationPropsModal {
  ruleIdToDelete: string | undefined;
  title: string;
  onCancel: () => void;
  onDeleted: () => void;
  onDeleting: () => void;
}

export function DeleteConfirmationModal({
  ruleIdToDelete,
  title,
  onCancel,
  onDeleted,
  onDeleting,
}: DeleteConfirmationPropsModal) {
  const [isVisible, setIsVisible] = useState(Boolean(ruleIdToDelete));

  const { mutateAsync: deleteRules } = useDeleteRules();

  const handleConfirm = async () => {
    if (ruleIdToDelete) {
      setIsVisible(false);

      onDeleting();

      await deleteRules({ ids: [ruleIdToDelete] });

      onDeleted();
    }
  };

  return isVisible ? (
    <EuiConfirmModal
      buttonColor="danger"
      data-test-subj="deleteIdsConfirmation"
      title={i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {title} after deleting.",
        values: { title },
      })}
      cancelButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.cancelButtonLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.rules.deleteConfirmationModal.deleteButtonLabel',
        {
          defaultMessage: 'Delete {title}',
          values: { title },
        }
      )}
      onCancel={onCancel}
      onConfirm={handleConfirm}
    >
      {i18n.translate('xpack.observability.rules.deleteConfirmationModal.descriptionText', {
        defaultMessage: "You can't recover {title} after deleting.",
        values: { title },
      })}
    </EuiConfirmModal>
  ) : null;
}
