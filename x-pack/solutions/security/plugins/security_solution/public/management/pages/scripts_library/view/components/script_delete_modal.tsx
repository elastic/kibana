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
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo, useCallback } from 'react';
import { useToasts } from '../../../../../common/lib/kibana';
import { AutoFocusButton } from '../../../../../common/components/autofocus_button/autofocus_button';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { SCRIPT_LIBRARY_LABELS as i18n } from '../../translations';
import { useDeleteEndpointScript } from '../../../../hooks/script_library';

interface EndpointScriptDeleteModalProps {
  scriptId: string;
  scriptName: string;
  onCancel: () => void;
  onSuccess: () => void;
  'data-test-subj'?: string;
}

export const EndpointScriptDeleteModal = memo<EndpointScriptDeleteModalProps>(
  ({ scriptId, scriptName, onCancel, onSuccess, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const modalTitleId = useGeneratedHtmlId();
    const toasts = useToasts();

    const { mutateAsync: deleteScriptMutation, isLoading: isDeleting } = useDeleteEndpointScript({
      onSuccess: () => {
        toasts.addSuccess(i18n.deleteModal.successToastTitle);
        onSuccess();
      },
      onError: (error) => {
        toasts.addError(error, {
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
        data-test-subj={getTestId()}
        aria-labelledby={modalTitleId}
        role="alertdialog"
      >
        <EuiModalHeader data-test-subj={getTestId('header')}>
          <EuiModalHeaderTitle id={modalTitleId}>{i18n.deleteModal.title}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody data-test-subj={getTestId('body')}>
          <EuiText>
            <FormattedMessage
              id="xpack.securitySolution.scriptsLibrary.table.actions.deleteConfirmationText"
              defaultMessage='Do you really want to delete "{scriptName}"? This action cannot be undone. The script and all its metadata will be permanently removed from the library.'
              values={{
                scriptName: <strong>{scriptName}</strong>,
              }}
            />
          </EuiText>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty
            onClick={onClickCancel}
            isDisabled={isDeleting}
            data-test-subj={getTestId('cancel-button')}
          >
            {i18n.deleteModal.cancelButtonLabel}
          </EuiButtonEmpty>

          <AutoFocusButton
            fill
            color="danger"
            onClick={onClickDelete}
            isLoading={isDeleting}
            isDisabled={isDeleting}
            data-test-subj={getTestId('delete-button')}
          >
            {i18n.deleteModal.deleteButtonLabel}
          </AutoFocusButton>
        </EuiModalFooter>
      </EuiModal>
    );
  }
);
EndpointScriptDeleteModal.displayName = 'EndpointScriptDeleteModal';
