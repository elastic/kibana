/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeleteSynonymRule } from '../../hooks/use_delete_synonym_rule';

export interface DeleteSynonymRuleModalProps {
  synonymsSetId: string;
  ruleId: string;
  closeDeleteModal: () => void;
}

export const DeleteSynonymRuleModal = ({
  closeDeleteModal,
  ruleId,
  synonymsSetId,
}: DeleteSynonymRuleModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const onSuccess = () => {
    setIsLoading(false);
    closeDeleteModal();
  };

  const onError = () => {
    setIsLoading(false);
    closeDeleteModal();
  };

  const { mutate: deleteEndpoint } = useDeleteSynonymRule(onSuccess, onError);

  const deleteOperation = () => {
    setIsLoading(true);
    deleteEndpoint({ synonymsSetId, ruleId });
  };

  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.searchSynonyms.deleteSynonymRuleModal.title', {
        defaultMessage: 'Delete synonym rule',
      })}
      onCancel={closeDeleteModal}
      onConfirm={deleteOperation}
      cancelButtonText={i18n.translate('xpack.searchSynonyms.deleteSynonymRuleModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate(
        'xpack.searchSynonyms.deleteSynonymRuleModal.confirmButton',
        {
          defaultMessage: 'Delete',
        }
      )}
      buttonColor="danger"
      isLoading={isLoading}
    >
      <p>
        {i18n.translate('xpack.searchSynonyms.deleteSynonymRuleModal.body', {
          defaultMessage: 'Are you sure you want to delete the synonym rule {ruleId}?',
          values: { ruleId },
        })}
      </p>
    </EuiConfirmModal>
  );
};
