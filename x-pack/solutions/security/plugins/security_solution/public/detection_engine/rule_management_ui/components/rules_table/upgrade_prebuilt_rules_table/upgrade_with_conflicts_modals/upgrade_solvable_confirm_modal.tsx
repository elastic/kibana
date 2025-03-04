/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import React, { memo } from 'react';
import * as i18n from './translations';

interface UpgradeWithSolvableConflictsModalProps {
  onCancel: () => void;
  onNoConflictConfirm: () => void;
  onSolvableConflictConfirm: () => void;
}

export const UpgradeWithSolvableConflictsModal = memo(
  function ConfirmUpgradeWithSolvableConflictsModal({
    onCancel,
    onNoConflictConfirm,
    onSolvableConflictConfirm,
  }: UpgradeWithSolvableConflictsModalProps): JSX.Element {
    return (
      <EuiModal data-test-subj="upgradeConflictsModal" onClose={onCancel}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.UPGRADE_CONFLICTS_MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>{i18n.UPGRADE_CONFLICTS_MODAL_BODY}</EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton onClick={onSolvableConflictConfirm}>
            {i18n.UPGRADE_CONFLICTS_MODAL_SOLVABLE_CONFLICT_CONFIRM}
          </EuiButton>
          <EuiButton onClick={onNoConflictConfirm} fill>
            {i18n.UPGRADE_CONFLICTS_MODAL_NO_CONFLICT_CONFIRM}
          </EuiButton>
          <EuiButtonEmpty onClick={onCancel}>{i18n.UPGRADE_CONFLICTS_MODAL_CANCEL}</EuiButtonEmpty>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
