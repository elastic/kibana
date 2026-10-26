/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import * as i18n from './translations';

interface DeleteDeprecatedRulesConfirmModalProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteDeprecatedRulesConfirmModal: React.FC<
  DeleteDeprecatedRulesConfirmModalProps
> = ({ count, onCancel, onConfirm }) => {
  return (
    <EuiConfirmModal
      aria-label={i18n.DELETE_ALL_CONFIRMATION_TITLE(count)}
      title={i18n.DELETE_ALL_CONFIRMATION_TITLE(count)}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={i18n.DELETE_ALL_DEPRECATED_RULES(count)}
      cancelButtonText={i18n.CANCEL_DELETE}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="deprecated-rules-delete-confirm-modal"
    >
      <p>{i18n.DELETE_ALL_CONFIRMATION_DESCRIPTION(count)}</p>
    </EuiConfirmModal>
  );
};
