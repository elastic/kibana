/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiConfirmModal } from '@elastic/eui';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useDeleteBackfill } from '../../api/hooks/use_delete_backfill';
import * as i18n from '../../translations';
import type { BackfillRow } from '../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';

export const StopBackfill = ({ backfill }: { backfill: BackfillRow }) => {
  const { telemetry } = useKibana().services;
  const { addSuccess, addError } = useAppToasts();
  const deleteBackfillMutation = useDeleteBackfill({
    onSuccess: () => {
      closeModal();
      telemetry.reportEvent(ManualRuleRunEventTypes.ManualRuleRunCancelJob, {
        totalTasks: backfill.total,
        completedTasks: backfill.complete,
        errorTasks: backfill.error,
      });
      addSuccess(i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_SUCCESS);
    },
    onError: (error) => {
      addError(error, {
        title: i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_ERROR,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => setIsModalVisible(true);
  const closeModal = () => setIsModalVisible(false);
  const onConfirm = () => {
    deleteBackfillMutation.mutate({ backfillId: backfill.id });
  };

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color={'primary'}
        onClick={showModal}
        data-test-subj="rule-backfills-delete-button"
      >
        {i18n.BACKFILLS_TABLE_STOP}
      </EuiButtonEmpty>
      {isModalVisible && (
        <EuiConfirmModal
          data-test-subj="rule-backfills-delete-modal"
          title={i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_TITLE}
          onCancel={closeModal}
          onConfirm={onConfirm}
          cancelButtonText={i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_CANCEL}
          confirmButtonText={i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_STOP_RUNS}
          defaultFocusedButton="confirm"
          buttonColor="danger"
          isLoading={deleteBackfillMutation.isLoading}
        >
          <p>{i18n.BACKFILLS_TABLE_STOP_CONFIRMATION_BODY}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
