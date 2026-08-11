/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import type { Moment } from 'moment';
import moment from 'moment';
import React, { memo, useCallback, useMemo, useState } from 'react';
import type { HealthIntervalParameters } from '../../../../../common/api/detection_engine';
import {
  HealthIntervalGranularity,
  HealthIntervalType,
} from '../../../../../common/api/detection_engine';
import * as i18n from '../../components/health_overview/translations';

export interface HealthIntervalFilterProps {
  /** Called whenever the user changes any interval parameter. */
  onChange: (interval: HealthIntervalParameters) => void;
  /** Whether the filter controls should be disabled (e.g. while loading). */
  disabled?: boolean;
}

export const HealthIntervalFilter = memo(function HealthIntervalFilter({
  onChange,
  disabled = false,
}: HealthIntervalFilterProps) {
  const [intervalType, setIntervalType] = useState<HealthIntervalType>(HealthIntervalType.last_day);
  const [granularity, setGranularity] = useState<HealthIntervalGranularity>(
    DEFAULT_GRANULARITY[HealthIntervalType.last_day]
  );
  const [fromDate, setFromDate] = useState<Moment>(moment().subtract(1, 'day'));
  const [toDate, setToDate] = useState<Moment>(moment());

  const granularityOptions = useMemo(
    () =>
      ALLOWED_GRANULARITIES[intervalType].map((g) => ({
        value: g,
        text: GRANULARITY_LABELS[g],
      })),
    [intervalType]
  );

  const isCustomRange = intervalType === HealthIntervalType.custom_range;

  const buildIntervalParams = useCallback(
    (
      type: HealthIntervalType,
      gran: HealthIntervalGranularity,
      from: Moment,
      to: Moment
    ): HealthIntervalParameters => {
      if (type === HealthIntervalType.custom_range) {
        return {
          type: HealthIntervalType.custom_range,
          granularity: gran,
          from: from.toISOString(),
          to: to.toISOString(),
        };
      }
      return { type, granularity: gran } as HealthIntervalParameters;
    },
    []
  );

  const handleIntervalTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as HealthIntervalType;
      const allowed = ALLOWED_GRANULARITIES[newType];
      const newGranularity = allowed.includes(granularity)
        ? granularity
        : DEFAULT_GRANULARITY[newType];

      setIntervalType(newType);
      setGranularity(newGranularity);
      onChange(buildIntervalParams(newType, newGranularity, fromDate, toDate));
    },
    [granularity, fromDate, toDate, onChange, buildIntervalParams]
  );

  const handleGranularityChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newGranularity = e.target.value as HealthIntervalGranularity;
      setGranularity(newGranularity);
      onChange(buildIntervalParams(intervalType, newGranularity, fromDate, toDate));
    },
    [intervalType, fromDate, toDate, onChange, buildIntervalParams]
  );

  const handleFromChange = useCallback(
    (date: Moment | null) => {
      if (date) {
        setFromDate(date);
        onChange(buildIntervalParams(intervalType, granularity, date, toDate));
      }
    },
    [intervalType, granularity, toDate, onChange, buildIntervalParams]
  );

  const handleToChange = useCallback(
    (date: Moment | null) => {
      if (date) {
        setToDate(date);
        onChange(buildIntervalParams(intervalType, granularity, fromDate, date));
      }
    },
    [intervalType, granularity, fromDate, onChange, buildIntervalParams]
  );

  return (
    <EuiFlexGroup gutterSize="m" alignItems="flexEnd" responsive={false} wrap>
      <EuiFlexItem grow={false} style={{ minWidth: 180 }}>
        <EuiFormRow label={i18n.INTERVAL_TYPE_LABEL} display="columnCompressed">
          <EuiSelect
            compressed
            options={INTERVAL_TYPE_OPTIONS}
            value={intervalType}
            onChange={handleIntervalTypeChange}
            disabled={disabled}
          />
        </EuiFormRow>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ minWidth: 130 }}>
        <EuiFormRow label={i18n.GRANULARITY_LABEL} display="columnCompressed">
          <EuiSelect
            compressed
            options={granularityOptions}
            value={granularity}
            onChange={handleGranularityChange}
            disabled={disabled}
          />
        </EuiFormRow>
      </EuiFlexItem>

      {isCustomRange && (
        <EuiFlexItem grow={false}>
          <EuiFormRow label={`${i18n.FROM_LABEL} / ${i18n.TO_LABEL}`} display="columnCompressed">
            <EuiDatePickerRange
              startDateControl={
                <EuiDatePicker
                  selected={fromDate}
                  onChange={handleFromChange}
                  startDate={fromDate}
                  endDate={toDate}
                  maxDate={toDate}
                  showTimeSelect
                  disabled={disabled}
                  compressed
                />
              }
              endDateControl={
                <EuiDatePicker
                  selected={toDate}
                  onChange={handleToChange}
                  startDate={fromDate}
                  endDate={toDate}
                  minDate={fromDate}
                  showTimeSelect
                  disabled={disabled}
                  compressed
                />
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

const INTERVAL_TYPE_OPTIONS = [
  { value: HealthIntervalType.last_hour, text: i18n.LAST_HOUR },
  { value: HealthIntervalType.last_day, text: i18n.LAST_24_HOURS },
  { value: HealthIntervalType.last_week, text: i18n.LAST_WEEK },
  { value: HealthIntervalType.last_month, text: i18n.LAST_MONTH },
  { value: HealthIntervalType.last_year, text: i18n.LAST_YEAR },
  { value: HealthIntervalType.custom_range, text: i18n.CUSTOM_RANGE },
];

const GRANULARITY_LABELS: Record<HealthIntervalGranularity, string> = {
  [HealthIntervalGranularity.minute]: i18n.GRANULARITY_MINUTE,
  [HealthIntervalGranularity.hour]: i18n.GRANULARITY_HOUR,
  [HealthIntervalGranularity.day]: i18n.GRANULARITY_DAY,
  [HealthIntervalGranularity.week]: i18n.GRANULARITY_WEEK,
  [HealthIntervalGranularity.month]: i18n.GRANULARITY_MONTH,
};

/**
 * Allowed granularity values for each interval type, as defined by
 * the HealthIntervalParameters io-ts schema.
 */
const ALLOWED_GRANULARITIES: Record<HealthIntervalType, HealthIntervalGranularity[]> = {
  [HealthIntervalType.last_hour]: [HealthIntervalGranularity.minute],
  [HealthIntervalType.last_day]: [HealthIntervalGranularity.minute, HealthIntervalGranularity.hour],
  [HealthIntervalType.last_week]: [HealthIntervalGranularity.hour, HealthIntervalGranularity.day],
  [HealthIntervalType.last_month]: [HealthIntervalGranularity.day, HealthIntervalGranularity.week],
  [HealthIntervalType.last_year]: [HealthIntervalGranularity.week, HealthIntervalGranularity.month],
  [HealthIntervalType.custom_range]: [
    HealthIntervalGranularity.minute,
    HealthIntervalGranularity.hour,
    HealthIntervalGranularity.day,
    HealthIntervalGranularity.week,
    HealthIntervalGranularity.month,
  ],
};

/**
 * Default granularity for each interval type (the last/coarsest allowed value
 * is usually a sensible default).
 */
const DEFAULT_GRANULARITY: Record<HealthIntervalType, HealthIntervalGranularity> = {
  [HealthIntervalType.last_hour]: HealthIntervalGranularity.minute,
  [HealthIntervalType.last_day]: HealthIntervalGranularity.hour,
  [HealthIntervalType.last_week]: HealthIntervalGranularity.day,
  [HealthIntervalType.last_month]: HealthIntervalGranularity.day,
  [HealthIntervalType.last_year]: HealthIntervalGranularity.month,
  [HealthIntervalType.custom_range]: HealthIntervalGranularity.hour,
};
