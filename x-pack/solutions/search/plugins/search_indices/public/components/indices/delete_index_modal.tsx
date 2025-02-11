/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDeleteIndex } from '../../hooks/api/use_delete_index';
interface DeleteIndexModelProps {
  onCancel: () => void;
  indexName: string;
  navigateToIndexListPage: () => void;
}
export const DeleteIndexModal: React.FC<DeleteIndexModelProps> = ({
  onCancel,
  indexName,
  navigateToIndexListPage,
}) => {
  const { mutate, isLoading, isSuccess } = useDeleteIndex(indexName);
  useEffect(() => {
    if (isSuccess) {
      navigateToIndexListPage();
    }
  }, [navigateToIndexListPage, isSuccess]);
  return (
    <EuiConfirmModal
      data-test-subj="deleteIndexActionModal"
      title={i18n.translate(
        'xpack.searchIndices.indexActionsMenu.deleteIndex.confirmModal.modalTitle',
        {
          defaultMessage: 'Delete index',
        }
      )}
      onCancel={onCancel}
      onConfirm={() => mutate()}
      isLoading={isLoading}
      buttonColor="danger"
      confirmButtonDisabled={false}
      cancelButtonText={i18n.translate(
        'xpack.searchIndices.indexActionsMenu.deleteIndex.confirmModal.cancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchIndices.indexActionsMenu.deleteIndex.confirmModal.confirmButtonText',
        {
          defaultMessage: 'Delete index',
        }
      )}
    >
      <Fragment>
        <p>
          <FormattedMessage
            id="xpack.searchIndices.indexActionsMenu.deleteIndex.deleteDescription"
            defaultMessage="You are about to delete this index:"
          />
        </p>
        <ul>
          <li>{indexName}</li>
        </ul>

        <p>
          <FormattedMessage
            id="xpack.searchIndices.indexActionsMenu.deleteIndex.deleteWarningDescription"
            defaultMessage="You can't recover a deleted index. Make sure you have appropriate backups."
          />
        </p>
      </Fragment>
    </EuiConfirmModal>
  );
};
