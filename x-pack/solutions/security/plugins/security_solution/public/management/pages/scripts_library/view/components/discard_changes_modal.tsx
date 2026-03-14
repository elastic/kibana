/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import { AutoFocusButton } from '../../../../../common/components/autofocus_button/autofocus_button';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { SCRIPT_LIBRARY_LABELS as discardChangesLabels } from '../../translations';
import type { ScriptsLibraryUrlParams } from './scripts_library_url_params';

const DISCARD_CHANGES_MODAL_WIDTH = 700;

interface DiscardChangesModalProps {
  show: Exclude<Required<ScriptsLibraryUrlParams>['show'], 'delete' | 'details'>;
  onCancel: () => void;
  onConfirm: () => void;
  'data-test-subj'?: string;
}

export const DiscardChangesModal = memo<DiscardChangesModalProps>(
  ({ show, onCancel, onConfirm, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const modalTitleId = useGeneratedHtmlId();

    const isEditing = useMemo(() => show === 'edit', [show]);
    const onClickCancel = useCallback(() => {
      onCancel();
    }, [onCancel]);

    return (
      <EuiModal
        onClose={onClickCancel}
        data-test-subj={dataTestSubj}
        aria-labelledby={modalTitleId}
        role="alertdialog"
        maxWidth={DISCARD_CHANGES_MODAL_WIDTH}
        css={{ minWidth: DISCARD_CHANGES_MODAL_WIDTH }}
      >
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle id={modalTitleId}>
            {isEditing
              ? discardChangesLabels.discardChangesModal.edit.title
              : discardChangesLabels.discardChangesModal.upload.title}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            {isEditing
              ? discardChangesLabels.discardChangesModal.edit.body
              : discardChangesLabels.discardChangesModal.upload.body}
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClickCancel} data-test-subj={getTestId('cancel-button')}>
            {isEditing
              ? discardChangesLabels.discardChangesModal.edit.cancelButtonLabel
              : discardChangesLabels.discardChangesModal.upload.cancelButtonLabel}
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={onConfirm}
            data-test-subj={getTestId('confirm-button')}
          >
            {isEditing
              ? discardChangesLabels.discardChangesModal.edit.discardButtonLabel
              : discardChangesLabels.discardChangesModal.upload.discardButtonLabel}
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
DiscardChangesModal.displayName = 'DiscardChangesModal';
