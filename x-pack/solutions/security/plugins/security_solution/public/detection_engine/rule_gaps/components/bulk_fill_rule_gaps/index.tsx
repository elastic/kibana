/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut } from '@elastic/eui';
import type moment from 'moment';
import React, { useMemo } from 'react';
import { MAX_BULK_FILL_RULE_GAPS_LOOKBACK_WINDOW_DAYS } from '../../../../../common/constants';

import * as i18n from './translations';
import { ScheduleBulkActionModal } from '../../../common/components/schedule_bulk_action_modal';

interface BulkFillRuleGapsModalProps {
  onCancel: () => void;
  onConfirm: (timeRange: { startDate: moment.Moment; endDate: moment.Moment }) => void;
  rulesCount: number;
}

const modalCopy = {
  modalTitle: i18n.BULK_FILL_RULE_GAPS_MODAL_TITLE,
  timeRangeTitle: i18n.BULK_FILL_RULE_GAPS_TIME_RANGE_TITLE,
  confirmButton: i18n.BULK_FILL_RULE_GAPS_CONFIRM_BUTTON,
  cancelButton: i18n.BULK_FILL_RULE_GAPS_CANCEL_BUTTON,
  errors: {
    startDateOutOfRange: i18n.BULK_FILL_RULE_GAPS_START_DATE_OUT_OF_RANGE_ERROR(
      MAX_BULK_FILL_RULE_GAPS_LOOKBACK_WINDOW_DAYS
    ),
    endDateInFuture: i18n.BULK_FILL_RULE_GAPS_FUTURE_TIME_RANGE_ERROR,
    invalidTimeRange: i18n.BULK_FILL_RULE_GAPS_INVALID_TIME_RANGE_ERROR,
  },
};

const BulkFillRuleGapsModalComponent = ({
  onCancel,
  onConfirm,
  rulesCount,
}: BulkFillRuleGapsModalProps) => {
  const callouts = useMemo(() => {
    const components = [
      <EuiCallOut
        size="s"
        iconType="warning"
        title={i18n.BULK_FILL_RULE_GAPS_NOTIFICATIONS_LIMITATIONS}
      />,
    ];
    if (rulesCount > 1) {
      components.push(
        <EuiCallOut
          size="s"
          iconType="warning"
          title={i18n.BULK_FILL_RULE_GAPS_MAX_GAPS_LIMITATIONS}
        />
      );
    }

    return components;
  }, [rulesCount]);
  return (
    <ScheduleBulkActionModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      text={modalCopy}
      maxLookbackWindowDays={MAX_BULK_FILL_RULE_GAPS_LOOKBACK_WINDOW_DAYS}
      callouts={callouts}
    />
  );
};

export const BulkFillRuleGapsModal = React.memo(BulkFillRuleGapsModalComponent);
BulkFillRuleGapsModal.displayName = 'BulkFillRuleGapsModal';
