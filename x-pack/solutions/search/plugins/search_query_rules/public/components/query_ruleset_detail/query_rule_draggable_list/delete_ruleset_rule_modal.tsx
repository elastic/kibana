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
import { useDeleteRulesetRule } from '../../../hooks/use_delete_query_rules_rule';

export interface DeleteRulesetRuleModalProps {
  rulesetId: string;
  ruleId: string;
  closeDeleteModal: () => void;
  onSuccessAction?: () => void;
}

export const DeleteRulesetRuleModal = ({
  closeDeleteModal,
  rulesetId,
  ruleId,
  onSuccessAction,
}: DeleteRulesetRuleModalProps) => {
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
  const { mutate: deleteEndpoint } = useDeleteRulesetRule(onSuccess, onError);
  const deleteOperation = () => {
    setIsLoading(true);
    deleteEndpoint({ rulesetId, ruleId });
  };
  return (
    <EuiConfirmModal
      title={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.title', {
        defaultMessage: 'Delete query rule?',
      })}
      onCancel={closeDeleteModal}
      onConfirm={deleteOperation}
      cancelButtonText={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.confirmButton', {
        defaultMessage: 'Delete rule',
      })}
      confirmButtonDisabled={checked === false}
      buttonColor="danger"
      isLoading={isLoading}
    >
      {i18n.translate('xpack.queryRules.deleteRulesetRuleModal.body', {
        defaultMessage:
          'Deleting a rule referenced in a query will result in a broken query.  Make sure you have fixed any references to this rule prior to deletion.',
      })}
      <EuiSpacer size="m" />
      <EuiCheckbox
        id={confirmCheckboxId}
        label="This rule is safe to delete"
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
