/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiCodeBlock, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeleteSynonymsSet } from '../../hooks/use_delete_synonyms_set';

export interface DeleteSynonymsSetModalProps {
  synonymsSetId: string;
  closeDeleteModal: () => void;
}

export const DeleteSynonymsSetModal = ({
  closeDeleteModal,
  synonymsSetId,
}: DeleteSynonymsSetModalProps) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const onSuccess = () => {
    setIsLoading(false);
    closeDeleteModal();
  };

  const onError = (errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
  };
  const { mutate: deleteEndpoint } = useDeleteSynonymsSet(onSuccess, onError);
  const deleteOperation = () => {
    setIsLoading(true);
    deleteEndpoint({ synonymsSetId });
  };
  return (
    <EuiConfirmModal
      aria-labelledby={confirmModalTitleId}
      title={i18n.translate('xpack.searchSynonyms.deleteSynonymsSetModal.title', {
        defaultMessage: 'Delete synonyms set',
      })}
      titleProps={{ id: confirmModalTitleId }}
      onCancel={closeDeleteModal}
      onConfirm={deleteOperation}
      cancelButtonText={i18n.translate('xpack.searchSynonyms.deleteSynonymsSetModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.searchSynonyms.deleteSynonymsSetModal.confirmButton',
        {
          defaultMessage: 'Delete',
        }
      )}
      buttonColor="danger"
      isLoading={isLoading}
    >
      {i18n.translate('xpack.searchSynonyms.deleteSynonymsSetModal.body', {
        defaultMessage:
          'Deleting a synonym set currently in use will cause failures in the ingest and query attempts targeting the related semantic text fields.',
      })}
      {error && (
        <EuiCodeBlock fontSize="s" paddingSize="s">
          {error}
        </EuiCodeBlock>
      )}
    </EuiConfirmModal>
  );
};