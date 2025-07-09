/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiCheckbox, EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DeleteRulesetRuleModalProps {
  closeDeleteModal: () => void;
  onConfirm?: () => void;
}

export const DeleteRulesetRuleModal = ({
  closeDeleteModal,
  onConfirm: onSuccessAction,
}: DeleteRulesetRuleModalProps) => {
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

  const deleteOperation = () => {
    setIsLoading(true);
    onSuccess();
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
      <EuiSpacer size="m" />
      <EuiCheckbox
        id={confirmCheckboxId}
        label="This rule is safe to delete"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
        }}
      />
    </EuiConfirmModal>
  );
};
