/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  CLEAR_ENTITY_DATA_BUTTON_TEST_ID,
  CLEAR_ENTITY_DATA_MODAL_TEST_ID,
} from '../../../test_ids';

interface ClearEntityDataButtonProps {
  onDelete: () => Promise<void>;
  isDeleting: boolean;
}

export const ClearEntityDataButton: React.FC<ClearEntityDataButtonProps> = ({
  onDelete,
  isDeleting,
}) => {
  const modalTitleId = useGeneratedHtmlId();
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const closeClearModal = useCallback(() => setIsClearModalVisible(false), []);
  const showClearModal = useCallback(() => setIsClearModalVisible(true), []);

  return (
    <>
      <EuiButtonEmpty
        color="danger"
        iconType="trash"
        onClick={showClearModal}
        data-test-subj={CLEAR_ENTITY_DATA_BUTTON_TEST_ID}
      >
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityAnalyticsManagementPage.clear"
          defaultMessage="Clear Entity Data"
        />
      </EuiButtonEmpty>

      {isClearModalVisible && (
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
          onCancel={closeClearModal}
          onConfirm={() => {
            onDelete().finally(closeClearModal);
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
