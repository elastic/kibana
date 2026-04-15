/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

interface ArtifactImportConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  'data-test-subj'?: string;
}

export const ArtifactImportConfirmModal: React.FC<ArtifactImportConfirmModalProps> = ({
  onCancel,
  onConfirm,
  isLoading,
  'data-test-subj': dataTestSubj = 'artifactImportConfirmModal',
}) => {
  const getTestId = useTestIdGenerator(dataTestSubj);
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId} data-test-subj={getTestId()}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.securitySolution.artifactListPage.importConfirmModal.title', {
            defaultMessage: 'Import artifacts?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            {i18n.translate('xpack.securitySolution.artifactListPage.importConfirmModal.info', {
              defaultMessage:
                "This will add new artifacts to your list. If an artifact you're importing already exists, the existing version will be kept, and the import of that artifact will be skipped.",
            })}
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj={getTestId('cancelButton')}>
          {i18n.translate(
            'xpack.securitySolution.artifactListPage.importConfirmModal.cancelButtonTitle',
            { defaultMessage: 'Cancel' }
          )}
        </EuiButtonEmpty>

        <EuiButton
          fill
          color="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          data-test-subj={getTestId('confirmButton')}
        >
          {i18n.translate(
            'xpack.securitySolution.artifactListPage.importConfirmModal.confirmButtonTitle',
            { defaultMessage: 'Import' }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

ArtifactImportConfirmModal.displayName = 'ArtifactImportConfirmModal';
