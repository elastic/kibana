/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiConfirmModal,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  useGeneratedHtmlId,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS } from '../../../../../common/constants';

import * as i18n from './translations';

const BULK_FILL_RULE_GAPS_MODAL_WIDTH = 600;

interface BulkFillRuleGapsModalProps {
  onCancel: () => void;
  onConfirm: (timeRange: { startDate: moment.Moment; endDate: moment.Moment }) => void;
  rulesCount: number;
}

const BulkFillRuleGapsModalComponent = ({
  onCancel,
  onConfirm,
  rulesCount,
}: BulkFillRuleGapsModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const now = moment();

  // By default we show three hours time range which user can then adjust
  const [startDate, setStartDate] = useState(now.clone().subtract(3, 'h'));
  const [endDate, setEndDate] = useState(now.clone());

  const isStartDateOutOfRange = now
    .clone()
    .subtract(MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS, 'd')
    .isAfter(startDate);
  const isEndDateInFuture = endDate.isAfter(now);
  const isInvalidTimeRange = startDate.isSameOrAfter(endDate);
  const isInvalid = isStartDateOutOfRange || isEndDateInFuture || isInvalidTimeRange;
  const errorMessage = useMemo(() => {
    if (isStartDateOutOfRange) {
      return i18n.BULK_FILL_RULE_GAPS_START_DATE_OUT_OF_RANGE_ERROR(
        MAX_MANUAL_RULE_RUN_LOOKBACK_WINDOW_DAYS
      );
    }
    if (isEndDateInFuture) {
      return i18n.BULK_FILL_RULE_GAPS_FUTURE_TIME_RANGE_ERROR;
    }
    if (isInvalidTimeRange) {
      return i18n.BULK_FILL_RULE_GAPS_INVALID_TIME_RANGE_ERROR;
    }
    return null;
  }, [isEndDateInFuture, isInvalidTimeRange, isStartDateOutOfRange]);

  const handleConfirm = useCallback(() => {
    onConfirm({ startDate, endDate });
  }, [endDate, onConfirm, startDate]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>{i18n.BULK_FILL_RULE_GAPS_MODAL_TITLE}</EuiFlexItem>
        </EuiFlexGroup>
      }
      titleProps={{ id: modalTitleId, style: { width: '100%' } }}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmButtonText={i18n.BULK_FILL_RULE_GAPS_CONFIRM_BUTTON}
      cancelButtonText={i18n.BULK_FILL_RULE_GAPS_CANCEL_BUTTON}
      confirmButtonDisabled={isInvalid}
      style={{ width: BULK_FILL_RULE_GAPS_MODAL_WIDTH }}
    >
      <EuiForm data-test-subj="fill-rule-gaps-modal-modal-form" fullWidth>
        <EuiFormRow
          data-test-subj="fill-rule-gaps-modal-time-range-form"
          label={i18n.BULK_FILL_RULE_GAPS_TIME_RANGE_TITLE}
          isInvalid={isInvalid}
          error={errorMessage}
        >
          <EuiDatePickerRange
            data-test-subj="fill-rule-gaps-modal-time-range"
            startDateControl={
              <EuiDatePicker
                className="start-date-picker"
                aria-label="Start date range"
                selected={startDate}
                onChange={(date) => date && setStartDate(date)}
                startDate={startDate}
                endDate={endDate}
                showTimeSelect={true}
              />
            }
            endDateControl={
              <EuiDatePicker
                className="end-date-picker"
                aria-label="End date range"
                selected={endDate}
                onChange={(date) => date && setEndDate(date)}
                startDate={startDate}
                endDate={endDate}
                showTimeSelect={true}
              />
            }
          />
        </EuiFormRow>
      </EuiForm>

      <EuiSpacer size="m" />

      <EuiCallOut
        size="s"
        iconType="warning"
        title={i18n.BULK_FILL_RULE_GAPS_NOTIFIACTIONS_LIMITATIONS}
      />

      {rulesCount > 1 && (
        <EuiCallOut
          size="s"
          iconType="warning"
          title={i18n.BULK_FILL_RULE_GAPS_MAX_GAPS_LIMITATIONS}
        />
      )}
    </EuiConfirmModal>
  );
};

export const BulkFillRuleGapsModal = React.memo(BulkFillRuleGapsModalComponent);
BulkFillRuleGapsModal.displayName = 'BulkFillRuleGapsModal';
