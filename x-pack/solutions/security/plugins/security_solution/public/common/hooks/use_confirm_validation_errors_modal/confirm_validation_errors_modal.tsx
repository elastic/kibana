/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import * as i18n from './translations';

interface ConfirmValidationErrorsModalProps {
  errors: string[];
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmValidationErrorsModal = memo(function ConfirmValidationErrorsModal({
  errors,
  onCancel,
  onConfirm,
}: ConfirmValidationErrorsModalProps): JSX.Element {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.SAVE_WITH_ERRORS_MODAL_TITLE}
      titleProps={{ id: modalTitleId }}
      data-test-subj="save-with-errors-confirmation-modal"
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.CANCEL}
      confirmButtonText={i18n.CONFIRM}
      defaultFocusedButton="confirm"
    >
      <>
        {i18n.SAVE_WITH_ERRORS_MESSAGE(errors.length)}
        <EuiSpacer size="s" />
        <ul>
          {errors.map((error) => {
            return (
              <li key={error}>
                <EuiText>{error}</EuiText>
              </li>
            );
          })}
        </ul>
      </>
    </EuiConfirmModal>
  );
});