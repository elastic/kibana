/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker, type OnTimeChangeProps } from '@elastic/eui';
import type { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useDatePickerContext } from '../../hooks/use_date_picker';

const COMMONLY_USED_RANGES: DurationRange[] = [
  {
    start: 'now-15m',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last15Minutes', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  {
    start: 'now-1h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last1Hour', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    start: 'now-3h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last3Hours', {
      defaultMessage: 'Last 3 hours',
    }),
  },
  {
    start: 'now-24h',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    start: 'now-7d',
    end: 'now',
    label: i18n.translate('xpack.infra.assetDetails.datePicker.commonlyUsedRanges.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
  },
];

export const DatePicker = () => {
  const { dateRange, setDateRange } = useDatePickerContext();
  const handleTimeChange = useCallback(
    ({ start, end, isInvalid }: OnTimeChangeProps) => {
      if (!isInvalid) {
        setDateRange({ from: start, to: end });
      }
    },
    [setDateRange]
  );
  return (
    <EuiSuperDatePicker
      commonlyUsedRanges={COMMONLY_USED_RANGES}
      start={dateRange.from}
      end={dateRange.to}
      onTimeChange={handleTimeChange}
      width="full"
    />
  );
};
