/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { useDeleteEntityEngineMutation } from '../hooks/use_entity_store';

interface ClearEntityDataButtonProps {
  deleteEntityEngineMutation: ReturnType<typeof useDeleteEntityEngineMutation>;
}

export const ClearEntityDataButton: React.FC<ClearEntityDataButtonProps> = ({
  deleteEntityEngineMutation,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const closeClearModal = useCallback(() => setIsClearModalVisible(false), []);
  const showClearModal = useCallback(() => setIsClearModalVisible(true), []);

  return (
    <>
      <EuiButtonEmpty color="danger" iconType="trash" onClick={showClearModal}>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clear"
          defaultMessage="Clear Entity Data"
        />
      </EuiButtonEmpty>

      {isClearModalVisible && (
        <EuiConfirmModal
          isLoading={deleteEntityEngineMutation.isLoading}
          aria-labelledby={modalTitleId}
          title={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clearEntitiesModal.title"
              defaultMessage="Clear Entity data?"
            />
          }
          titleProps={{ id: modalTitleId }}
          onCancel={closeClearModal}
          onConfirm={() => {
            deleteEntityEngineMutation.mutateAsync().then(closeClearModal);
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
      )}
    </>
  );
};
