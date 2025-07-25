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
  EuiSpacer,
} from '@elastic/eui';
import moment from 'moment';
import type { ReactNode } from 'react';
import React, { Fragment, useCallback, useMemo, useState } from 'react';

const MODAL_WIDTH = 600;

interface ScheduleBulkActionModalProps {
  onCancel: () => void;
  onConfirm: (timeRange: { startDate: moment.Moment; endDate: moment.Moment }) => void;
  text: {
    modalTitle: string;
    timeRangeTitle: string;
    confirmButton: string;
    cancelButton: string;
    errors: {
      startDateOutOfRange: string;
      endDateInFuture: string;
      invalidTimeRange: string;
    };
  };
  maxLookbackWindowDays: number;
  callouts: ReactNode[];
}

const ScheduleBulkActionModalComponent = ({
  onCancel,
  onConfirm,
  text,
  maxLookbackWindowDays,
  callouts,
}: ScheduleBulkActionModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const now = moment();

  // By default we show three hours time range which user can then adjust
  const [startDate, setStartDate] = useState(now.clone().subtract(3, 'h'));
  const [endDate, setEndDate] = useState(now.clone());

  const isStartDateOutOfRange = now.clone().subtract(maxLookbackWindowDays, 'd').isAfter(startDate);
  const isEndDateInFuture = endDate.isAfter(now);
  const isInvalidTimeRange = startDate.isSameOrAfter(endDate);
  const isInvalid = isStartDateOutOfRange || isEndDateInFuture || isInvalidTimeRange;
  const errorMessage = useMemo(() => {
    if (isStartDateOutOfRange) {
      return text.errors.startDateOutOfRange;
    }
    if (isEndDateInFuture) {
      return text.errors.endDateInFuture;
    }
    if (isInvalidTimeRange) {
      return text.errors.invalidTimeRange;
    }
    return null;
  }, [
    isEndDateInFuture,
    isInvalidTimeRange,
    isStartDateOutOfRange,
    text.errors.startDateOutOfRange,
    text.errors.endDateInFuture,
    text.errors.invalidTimeRange,
  ]);

  const handleConfirm = useCallback(() => {
    onConfirm({ startDate, endDate });
  }, [endDate, onConfirm, startDate]);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>{text.modalTitle}</EuiFlexItem>
        </EuiFlexGroup>
      }
      titleProps={{ id: modalTitleId, style: { width: '100%' } }}
      onCancel={onCancel}
      onConfirm={handleConfirm}
      confirmButtonText={text.confirmButton}
      cancelButtonText={text.cancelButton}
      confirmButtonDisabled={isInvalid}
      css={{ width: MODAL_WIDTH }}
    >
      <EuiForm data-test-subj="schedule-bulk-action-modal-form" fullWidth>
        <EuiFormRow
          data-test-subj="schedule-bulk-action-modal-time-range-form"
          label={text.timeRangeTitle}
          isInvalid={isInvalid}
          error={errorMessage}
        >
          <EuiDatePickerRange
            data-test-subj="schedule-bulk-action-time-range"
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

      {callouts.map((callout, idx) => {
        return (
          <Fragment key={`callout-${idx}`}>
            <EuiSpacer size="m" />
            {callout}
          </Fragment>
        );
      })}
    </EuiConfirmModal>
  );
};

export const ScheduleBulkActionModal = React.memo(ScheduleBulkActionModalComponent);
ScheduleBulkActionModal.displayName = 'ScheduleBulkActionModal';
