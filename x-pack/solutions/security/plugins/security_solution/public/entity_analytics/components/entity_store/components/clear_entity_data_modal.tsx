/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { CLEAR_ENTITY_DATA_MODAL_TEST_ID } from '../../../test_ids';

interface ClearEntityDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const ClearEntityDataModal: React.FC<ClearEntityDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  if (!isOpen) {
    return null;
  }

  return (
    <EuiConfirmModal
      isLoading={isDeleting}
      aria-labelledby={modalTitleId}
      data-test-subj={CLEAR_ENTITY_DATA_MODAL_TEST_ID}
      title={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.title"
          defaultMessage="Clear Entity data?"
        />
      }
      titleProps={{ id: modalTitleId }}
      onCancel={onClose}
      onConfirm={() => {
        onConfirm().finally(onClose);
      }}
      cancelButtonText={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.close"
          defaultMessage="Close"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.clearAllEntities"
          defaultMessage="Clear All Entities"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearConfirmation"
        defaultMessage="This will delete all Security Entity store records. Source data, Entity risk scores, and Asset criticality assignments are unaffected by this action. This operation cannot be undone."
      />
    </EuiConfirmModal>
  );
};
