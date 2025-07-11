/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { METRIC_TYPE, track, TELEMETRY_EVENT } from '../../../../../common/lib/telemetry';
import type { BulkActionEditPayloadDeleteAlertSuppression } from '../../../../../../common/api/detection_engine/rule_management';
import { BulkActionEditTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import { bulkAlertSuppression as i18n } from './translations';

interface Props {
  rulesCount: number;
  onCancel: () => void;
  onConfirm: (bulkActionEditPayload: BulkActionEditPayloadDeleteAlertSuppression) => void;
}

export const BulkEditDeleteAlertSuppressionConfirmation: React.FC<Props> = ({
  rulesCount,
  onCancel,
  onConfirm,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.DELETE_CONFIRMATION_TITLE}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={() => {
        onConfirm({
          type: BulkActionEditTypeEnum.delete_alert_suppression,
        });
        track(METRIC_TYPE.CLICK, TELEMETRY_EVENT.SET_ALERT_SUPPRESSION_FOR_THRESHOLD);
      }}
      confirmButtonText={i18n.DELETE_CONFIRMATION_CONFIRM}
      cancelButtonText={i18n.DELETE_CONFIRMATION_CANCEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      data-test-subj="deleteRulesConfirmationModal"
    >
      <FormattedMessage
        id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.alertSuppression.deleteAlertSuppressionConfirmationModalBody"
        defaultMessage="This action will remove alert suppression from {rulesCount, plural, one {the chosen rule} other {{rulesCountStrong} rules}}. Click {deleteStrong} to continue."
        values={{
          rulesCount,
          rulesCountStrong: <strong>{rulesCount}</strong>,
          deleteStrong: (
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.alertSuppression.deleteAlertSuppressionConfirmationModalBodyDeleteBtnLabel"
                defaultMessage="Delete"
              />
            </strong>
          ),
        }}
      />
    </EuiConfirmModal>
  );
};

BulkEditDeleteAlertSuppressionConfirmation.displayName =
  'BulkEditDeleteAlertSuppressionConfirmation';
