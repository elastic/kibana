/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DeleteRulesetRuleModalProps {
  closeDeleteModal: () => void;
  onConfirm?: () => void;
}

export const DeleteRulesetRuleModal = ({
  closeDeleteModal,
  onConfirm: onSuccessAction,
}: DeleteRulesetRuleModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const onSuccess = () => {
    setIsLoading(false);
    closeDeleteModal();
    if (onSuccessAction) {
      onSuccessAction();
    }
  };

  const deleteOperation = () => {
    setIsLoading(true);
    onSuccess();
  };

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.title', {
        defaultMessage: 'Delete query rule?',
      })}
      titleProps={{ id: modalTitleId }}
      onCancel={closeDeleteModal}
      onConfirm={deleteOperation}
      cancelButtonText={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.queryRules.deleteRulesetRuleModal.confirmButton', {
        defaultMessage: 'Delete rule',
      })}
      buttonColor="danger"
      isLoading={isLoading}
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.queryRules.deleteRulesetRuleModal.description"
            defaultMessage="Are you sure you want to delete this rule?"
          />
        </p>
      </EuiText>
    </EuiConfirmModal>
  );
};
