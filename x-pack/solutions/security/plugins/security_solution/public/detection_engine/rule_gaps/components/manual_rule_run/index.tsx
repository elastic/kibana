/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type moment from 'moment';
import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS } from '../../../../../common/constants';

import * as i18n from './translations';
import { ScheduleBulkActionModal } from '../../../common/components/schedule_bulk_action_modal';

interface ManualRuleRunModalProps {
  onCancel: () => void;
  onConfirm: (timeRange: { startDate: moment.Moment; endDate: moment.Moment }) => void;
}

const modalCopy = {
  modalTitle: i18n.MANUAL_RULE_RUN_MODAL_TITLE,
  timeRangeTitle: i18n.MANUAL_RULE_RUN_TIME_RANGE_TITLE,
  confirmButton: i18n.MANUAL_RULE_RUN_CONFIRM_BUTTON,
  cancelButton: i18n.MANUAL_RULE_RUN_CANCEL_BUTTON,
  errors: {
    startDateOutOfRange: i18n.MANUAL_RULE_RUN_START_DATE_OUT_OF_RANGE_ERROR(
      MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS
    ),
    endDateInFuture: i18n.MANUAL_RULE_RUN_FUTURE_TIME_RANGE_ERROR,
    invalidTimeRange: i18n.MANUAL_RULE_RUN_INVALID_TIME_RANGE_ERROR,
  },
};

const ManualRuleRunModalComponent = ({ onCancel, onConfirm }: ManualRuleRunModalProps) => {
  const callouts = useMemo(() => {
    return [
      <EuiCallOut
        size="s"
        iconType="warning"
        title={i18n.MANUAL_RULE_RUN_NOTIFIACTIONS_LIMITATIONS}
      />,
    ];
  }, []);
  return (
    <ScheduleBulkActionModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      text={modalCopy}
      maxLookbackWindowDays={MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS}
      callouts={callouts}
    />
  );
};

export const ManualRuleRunModal = React.memo(ManualRuleRunModalComponent);
ManualRuleRunModal.displayName = 'ManualRuleRunModal';
