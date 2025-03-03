/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

interface ConfirmArtifactModalProps {
  title: string;
  body: string;
  confirmButton: string;
  cancelButton: string;
  onCancel: () => void;
  onSuccess: () => void;
  'data-test-subj'?: string;
}

export const ArtifactConfirmModal = memo<ConfirmArtifactModalProps>(
  ({
    title,
    body,
    confirmButton,
    cancelButton,
    onCancel,
    onSuccess,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiModal onClose={onCancel} data-test-subj={dataTestSubj}>
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <p>{body}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onCancel} data-test-subj={getTestId('cancelButton')}>
            {cancelButton}
          </EuiButtonEmpty>

          <EuiButton fill onClick={onSuccess} data-test-subj={getTestId('submitButton')}>
            {confirmButton}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
ArtifactConfirmModal.displayName = 'ArtifactConfirmModal';
