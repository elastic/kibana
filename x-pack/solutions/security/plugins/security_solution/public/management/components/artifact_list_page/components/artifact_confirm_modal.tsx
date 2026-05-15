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
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import type { ArtifactConfirmModalLabelProps } from '../types';

export const CONFIRM_WARNING_MODAL_LABELS = (
  entryType: string,
  warnings: Partial<{ hasWildcardWithWrongOperator: boolean; hasUnnecessaryEscaping: boolean }>
): ArtifactConfirmModalLabelProps => {
  const listOfWarnings: string[] = [
    ...(warnings.hasWildcardWithWrongOperator
      ? [
          i18n.translate(
            'xpack.securitySolution.artifacts.confirmWarningModal.wildcardWithWrongOperator',
            {
              defaultMessage:
                'Using a "*" or a "?" in the value with the "is" operator can make the entry ineffective. Change the operator to "matches" to ensure wildcards run properly.',
            }
          ),
        ]
      : []),

    ...(warnings.hasUnnecessaryEscaping
      ? [
          i18n.translate(
            'xpack.securitySolution.artifacts.confirmWarningModal.unnecessaryEscaping',
            {
              defaultMessage:
                'Endpoint artifacts do not require escaping when using "\\", "*" or "?" characters.',
            }
          ),
        ]
      : []),
  ];

  return {
    title: i18n.translate('xpack.securitySolution.artifacts.confirmWarningModal.title', {
      defaultMessage: `Confirm {type}`,
      values: { type: entryType },
    }),
    warningsHeader: i18n.translate(
      'xpack.securitySolution.artifacts.confirmWarningModal.reviewWarningsHeader',
      { defaultMessage: 'Please review the following warnings:' }
    ),
    listOfWarnings,
    warningsFooter: i18n.translate(
      'xpack.securitySolution.artifacts.confirmWarningModal.reviewEntryFooter',
      {
        defaultMessage:
          'Select “Cancel” to revise your entry, or "Add" to continue with the entry in its current state.',
      }
    ),
    confirmButton: i18n.translate(
      'xpack.securitySolution.artifacts.confirmWarningModal.confirmButtonText',
      {
        defaultMessage: 'Add',
      }
    ),
    cancelButton: i18n.translate(
      'xpack.securitySolution.trustedapps.confirmWarningModal.cancelButtonText',
      {
        defaultMessage: 'Cancel',
      }
    ),
  };
};

interface ArtifactConfirmModalProps {
  labels: ArtifactConfirmModalLabelProps;
  onCancel: () => void;
  onSuccess: () => void;
  'data-test-subj'?: string;
}

export const ArtifactConfirmModal = memo<ArtifactConfirmModalProps>(
  ({
    labels: { title, warningsHeader, listOfWarnings, warningsFooter, confirmButton, cancelButton },
    onCancel,
    onSuccess,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const artifactConfirmModalTitleId = useGeneratedHtmlId();

    return (
      <EuiModal
        onClose={onCancel}
        data-test-subj={dataTestSubj}
        aria-labelledby={artifactConfirmModalTitleId}
      >
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle id={artifactConfirmModalTitleId}>{title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <p>{warningsHeader}</p>

            <ul>
              {listOfWarnings.map((warning, index) => (
                <li
                  key={index}
                  css={css`
                    margin-bottom: ${euiTheme.size.s};
                  `}
                >
                  {warning}
                </li>
              ))}
            </ul>

            <p>{warningsFooter}</p>
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
