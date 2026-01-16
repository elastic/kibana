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
import React, { memo, useCallback } from 'react';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { AutoFocusButton } from '../../../../../common/components/autofocus_button/autofocus_button';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useDeleteEndpointScript } from '../hooks/use_delete_script_by_id';
import { scriptsLibraryLabels as i18n } from '../../translations';

interface ScriptDeleteModalProps {
  scriptId: string;
  scriptName: string;
  onCancel: () => void;
  onSuccess: () => void;
  'data-test-subj'?: string;
}

export const ScriptDeleteModal = memo<ScriptDeleteModalProps>(
  ({ scriptId, scriptName, onCancel, onSuccess, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const modalTitleId = useGeneratedHtmlId();
    const { addError, addSuccess } = useAppToasts();

    const { mutate: deleteScriptMutation, isLoading: isDeleting } = useDeleteEndpointScript({
      onSuccess: () => {
        addSuccess(i18n.deleteModal.successToastTitle);
        onSuccess();
      },
      onError: (error) => {
        addError(error, {
          title: i18n.deleteModal.errorToastTitle,
          toastMessage: error?.body?.message ?? error.message,
        });
      },
    });

    const onClickDelete = useCallback(() => {
      deleteScriptMutation({ script_id: scriptId });
    }, [deleteScriptMutation, scriptId]);

    const onClickCancel = useCallback(() => {
      if (!isDeleting) {
        onCancel();
      }
    }, [isDeleting, onCancel]);

    return (
      <EuiModal
        onClose={onClickCancel}
        data-test-subj={dataTestSubj}
        aria-labelledby={modalTitleId}
      >
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle id={modalTitleId}>
            {i18n.deleteModal.title(scriptName)}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <p>{i18n.deleteModal.confirmationText}</p>
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={onClickCancel}
            isDisabled={isDeleting}
            data-test-subj={getTestId('cancelButton')}
          >
            {i18n.deleteModal.cancelButtonLabel}
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={onClickDelete}
            isLoading={isDeleting}
            isDisabled={isDeleting}
            data-test-subj={getTestId('submitButton')}
          >
            {i18n.deleteModal.deleteButtonLabel}
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
ScriptDeleteModal.displayName = 'ScriptDeleteModal';
