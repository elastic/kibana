/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiCheckbox,
  EuiCodeBlock,
  EuiConfirmModal,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDeleteRuleset } from '../../hooks/use_delete_query_rules_ruleset';

export interface DeleteRulesetModalProps {
  rulesetId: string;
  closeDeleteModal: () => void;
  onSuccessAction?: () => void;
}

export const DeleteRulesetModal = ({
  closeDeleteModal,
  rulesetId,
  onSuccessAction,
}: DeleteRulesetModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const onSuccess = () => {
    setIsLoading(false);
    closeDeleteModal();
    if (onSuccessAction) {
      onSuccessAction();
    }
  };
  const confirmCheckboxId = useGeneratedHtmlId({
    prefix: 'confirmCheckboxId',
  });
  const [checked, setChecked] = useState(false);

  const onError = (errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
  };
  const { mutate: deleteEndpoint } = useDeleteRuleset(onSuccess, onError);
  const deleteOperation = () => {
    setIsLoading(true);
    deleteEndpoint({ rulesetId });
  };
  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={i18n.translate('xpack.queryRules.deleteRulesetModal.title', {
        defaultMessage: 'Delete query ruleset?',
      })}
      onCancel={closeDeleteModal}
      onConfirm={deleteOperation}
      cancelButtonText={i18n.translate('xpack.queryRules.deleteRulesetModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.queryRules.deleteRulesetModal.confirmButton', {
        defaultMessage: 'Delete ruleset',
      })}
      confirmButtonDisabled={checked === false}
      buttonColor="danger"
      isLoading={isLoading}
    >
      {i18n.translate('xpack.queryRules.deleteRulesetModal.body', {
        defaultMessage:
          'Deleting a ruleset referenced in a query will result in a broken query.  Make sure you have fixed any references to this ruleset prior to deletion.',
      })}
      <EuiSpacer size="m" />
      <EuiCheckbox
        id={confirmCheckboxId}
        label="This ruleset is safe to delete"
        data-test-subj="confirmDeleteRulesetCheckbox"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
        }}
      />

      {error && (
        <EuiCodeBlock fontSize="s" paddingSize="s">
          {error}
        </EuiCodeBlock>
      )}
    </EuiConfirmModal>
  );
};
