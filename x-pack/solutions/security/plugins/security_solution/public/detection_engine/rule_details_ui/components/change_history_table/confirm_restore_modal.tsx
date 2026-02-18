/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

interface ChangeHistoryConfirmRestoreModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ChangeHistoryConfirmRestoreModal = ({
  onCancel,
  onConfirm,
}: ChangeHistoryConfirmRestoreModalProps): JSX.Element => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.CONFIRM_RESTORE_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      data-test-subj="save-with-errors-confirmation-modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.CANCEL_BUTTON_LABEL}
      confirmButtonText={i18n.CONFIRM_BUTTON_LABEL}
      defaultFocusedButton="confirm"
    >
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_1}</EuiText>
      <EuiSpacer size="s" />
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_2}</EuiText>
      <EuiSpacer size="s" />
      <EuiText>{i18n.CONFIRM_RESTORE_MODAL_MESSAGE_3}</EuiText>
    </EuiConfirmModal>
  );
};
