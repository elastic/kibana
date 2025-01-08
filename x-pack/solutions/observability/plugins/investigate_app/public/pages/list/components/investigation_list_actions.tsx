/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiToolTip,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationResponse } from '@kbn/investigation-shared/src/rest_specs/investigation';
import { useDeleteInvestigation } from '../../../hooks/use_delete_investigation';
import { InvestigationEditForm } from '../../../components/investigation_edit_form/investigation_edit_form';
export function InvestigationListActions({
  investigation,
}: {
  investigation: InvestigationResponse;
}) {
  const [isEditFormFlyoutVisible, setEditFormFlyoutVisible] = useState<boolean>(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState<boolean>(false);
  const {
    mutate: deleteInvestigation,
    isLoading: isDeleting,
    isError,
    isSuccess,
  } = useDeleteInvestigation();
  const closeDeleteModal = () => setIsDeleteModalVisible(false);

  useEffect(() => {
    if (isError || isSuccess) {
      closeDeleteModal();
    }
  }, [isError, isSuccess]);

  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      {isDeleteModalVisible && (
        <EuiModal aria-labelledby={modalTitleId} onClose={closeDeleteModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={modalTitleId}>
              {i18n.translate('xpack.investigateApp.deleteModal.title', {
                defaultMessage: 'Delete',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            {i18n.translate('xpack.investigateApp.deleteModal.description', {
              defaultMessage: "You can't recover this investigation after deletion.",
            })}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={closeDeleteModal}
                  data-test-subj="investigateAppInvestigationListDeleteModalCancelButton"
                >
                  {i18n.translate('xpack.investigateApp.deleteModal.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="investigateAppInvestigationListDeleteModalConfirmButton"
                  onClick={() => {
                    deleteInvestigation({ investigationId: investigation.id });
                  }}
                  fill
                  color="danger"
                  isLoading={isDeleting}
                >
                  {i18n.translate('xpack.investigateApp.deleteModal.confirm', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalFooter>
        </EuiModal>
      )}
      {isEditFormFlyoutVisible && investigation && (
        <InvestigationEditForm
          investigationId={investigation.id}
          onClose={() => setEditFormFlyoutVisible(false)}
        />
      )}
      <EuiToolTip
        content={i18n.translate('xpack.investigateApp.investigationList.editAction', {
          defaultMessage: 'Edit',
        })}
      >
        <EuiButtonIcon
          data-test-subj="investigateAppInvestigationListEditButton"
          aria-label={i18n.translate(
            'xpack.investigateApp.investigationList.editAction.ariaLabel',
            {
              defaultMessage: 'Edit investigation "{name}"',
              values: { name: investigation.title },
            }
          )}
          iconType="pencil"
          onClick={() => setEditFormFlyoutVisible(true)}
        />
      </EuiToolTip>
      <EuiToolTip
        content={i18n.translate('xpack.investigateApp.investigationList.deleteAction', {
          defaultMessage: 'Delete',
        })}
      >
        <EuiButtonIcon
          data-test-subj="investigateAppInvestigationListDeleteButton"
          aria-label={i18n.translate(
            'xpack.investigateApp.investigationList.deleteAction.ariaLabel',
            {
              defaultMessage: 'Delete investigation "{name}"',
              values: { name: investigation.title },
            }
          )}
          iconType="trash"
          onClick={() => setIsDeleteModalVisible(true)}
        />
      </EuiToolTip>
    </EuiFlexGroup>
  );
}
