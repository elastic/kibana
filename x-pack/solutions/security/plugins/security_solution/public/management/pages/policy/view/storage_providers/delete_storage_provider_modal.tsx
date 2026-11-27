/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiConfirmModal, EuiSpacer, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { ExportProvider } from '../../../../../../common/endpoint/types';
import {
  DELETE_ERROR_TITLE,
  DELETE_MODAL_CANCEL_BUTTON_LABEL,
  DELETE_MODAL_CONFIRM_BUTTON_LABEL,
  DELETE_MODAL_DESCRIPTION,
  getDeleteModalTitle,
} from './translations';

export interface DeleteStorageProviderModalProps {
  provider: ExportProvider;
  isDeleting: boolean;
  /** The server's message when the last policy update failed */
  errorMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteStorageProviderModal = memo<DeleteStorageProviderModalProps>(
  ({ provider, isDeleting, errorMessage, onConfirm, onCancel }) => {
    const titleId = useGeneratedHtmlId();

    const handleCancel = useCallback(() => {
      if (!isDeleting) {
        onCancel();
      }
    }, [isDeleting, onCancel]);

    return (
      <EuiConfirmModal
        aria-labelledby={titleId}
        title={getDeleteModalTitle(provider.id)}
        titleProps={{ id: titleId }}
        onCancel={handleCancel}
        onConfirm={onConfirm}
        cancelButtonText={DELETE_MODAL_CANCEL_BUTTON_LABEL}
        confirmButtonText={DELETE_MODAL_CONFIRM_BUTTON_LABEL}
        buttonColor="danger"
        isLoading={isDeleting}
        data-test-subj="deleteStorageProviderModal"
      >
        {errorMessage && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={DELETE_ERROR_TITLE}
              text={errorMessage}
              data-test-subj="deleteStorageProviderModal-error"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiText size="s">
          <p>{DELETE_MODAL_DESCRIPTION}</p>
        </EuiText>
      </EuiConfirmModal>
    );
  }
);

DeleteStorageProviderModal.displayName = 'DeleteStorageProviderModal';
