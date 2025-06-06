/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
}) => (
  <EuiConfirmModal
    title={i18n.DELETE_CONFIRMATION_TITLE}
    onCancel={onCancel}
    onConfirm={() =>
      onConfirm({
        type: BulkActionEditTypeEnum.delete_alert_suppression,
      })
    }
    confirmButtonText={i18n.DELETE_CONFIRMATION_CONFIRM}
    cancelButtonText={i18n.DELETE_CONFIRMATION_CANCEL}
    buttonColor="danger"
    defaultFocusedButton="confirm"
    data-test-subj="deleteRulesConfirmationModal"
  >
    <FormattedMessage
      id="xpack.securitySolution.detectionEngine.rules.allRules.bulkActions.edit.alertSuppression.deleteAlertSuppressionConfirmationModalBody"
      defaultMessage='This action will try to delete alert suppression in {rulesCount, plural, one {the chosen rule} other {{rulesCount} rules}}. Click "Delete" to continue.'
      values={{
        rulesCount,
        rulesCountStrong: <strong>{rulesCount}</strong>,
      }}
    />
  </EuiConfirmModal>
);

BulkEditDeleteAlertSuppressionConfirmation.displayName =
  'BulkEditDeleteAlertSuppressionConfirmation';
