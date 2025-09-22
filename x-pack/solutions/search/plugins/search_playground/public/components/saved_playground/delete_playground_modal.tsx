/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { getErrorMessage } from '../../../common/errors';
import { useKibana } from '../../hooks/use_kibana';
import { useDeleteSavedPlayground } from '../../hooks/use_delete_saved_playground';

export interface DeletePlaygroundModalProps {
  playgroundId: string;
  playgroundName: string;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

export const DeletePlaygroundModal = ({
  playgroundId,
  playgroundName,
  onClose,
  onDeleteSuccess,
}: DeletePlaygroundModalProps) => {
  const { notifications } = useKibana().services;
  const { deleteSavedPlayground, isLoading } = useDeleteSavedPlayground();
  const onDeleteError = useCallback(
    (error: unknown) => {
      onClose();
      const errorMessage = getErrorMessage(error);
      notifications.toasts.addError(error instanceof Error ? error : new Error(errorMessage), {
        title: i18n.translate('xpack.searchPlayground.savedPlayground.deleteError.title', {
          defaultMessage: 'Error deleting playground',
        }),
        toastMessage: errorMessage,
      });
    },
    [notifications.toasts, onClose]
  );
  const onDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.preventDefault();

      deleteSavedPlayground(playgroundId, {
        onSuccess: onDeleteSuccess,
        onError: onDeleteError,
      });
    },
    [deleteSavedPlayground, onDeleteError, onDeleteSuccess, playgroundId]
  );
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      data-test-subj="deletePlaygroundActionModal"
      aria-labelledby={modalTitleId}
      title={i18n.translate(
        'xpack.searchPlayground.savedPlayground.deletePlayground.confirmModal.modalTitle',
        {
          defaultMessage: 'Delete playground',
        }
      )}
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={onDelete}
      isLoading={isLoading}
      buttonColor="danger"
      cancelButtonText={i18n.translate(
        'xpack.searchPlayground.savedPlayground.deletePlayground.confirmModal.cancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchPlayground.savedPlayground.deletePlayground.confirmModal.confirmButtonText',
        {
          defaultMessage: 'Delete playground',
        }
      )}
    >
      <>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.deletePlayground.deleteDescription"
              defaultMessage="You are about to delete the {playgroundName} playground"
              values={{
                playgroundName: <strong>{playgroundName}</strong>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.searchPlayground.savedPlayground.deletePlayground.deleteWarningDescription"
              defaultMessage="You can't recover a deleted playground. Make sure you have appropriate backups."
            />
          </p>
        </EuiText>
      </>
    </EuiConfirmModal>
  );
};
