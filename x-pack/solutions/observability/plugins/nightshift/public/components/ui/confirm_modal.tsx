/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  type EuiButtonProps,
} from '@elastic/eui';
import { getEbtProps, type EbtClickAttrs } from '@kbn/ebt-click';

interface ConfirmModalProps {
  title: React.ReactNode;
  cancelButtonText: string;
  confirmButtonText: string;
  confirmEbt: EbtClickAttrs;
  buttonColor?: EuiButtonProps['color'];
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

export function ConfirmModal({
  title,
  cancelButtonText,
  confirmButtonText,
  confirmEbt,
  buttonColor = 'primary',
  onCancel,
  onConfirm,
  children,
  'data-test-subj': dataTestSubj,
}: ConfirmModalProps) {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiModal
      onClose={onCancel}
      maxWidth={448}
      aria-labelledby={titleId}
      data-test-subj={dataTestSubj}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="confirmModalCancelButton">
          {cancelButtonText}
        </EuiButtonEmpty>
        <EuiButton
          fill
          color={buttonColor}
          onClick={onConfirm}
          data-test-subj="confirmModalConfirmButton"
          {...getEbtProps(confirmEbt)}
        >
          {confirmButtonText}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
