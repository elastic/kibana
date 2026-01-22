/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';

const TIME_RANGE_OPTIONS = [
  { value: '1h', text: 'Last hour' },
  { value: '4h', text: 'Last 4 hours' },
  { value: '24h', text: 'Last 24 hours' },
  { value: '7d', text: 'Last 7 days' },
  { value: '30d', text: 'Last 30 days' },
];

interface DriftTimeRangeFilterProps {
  selectedTimeRange: string;
  onTimeRangeChange: (timeRange: string) => void;
}

const DriftTimeRangeFilterComponent: React.FC<DriftTimeRangeFilterProps> = ({
  selectedTimeRange,
  onTimeRangeChange,
}) => {
  const options: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      TIME_RANGE_OPTIONS.map((option) => ({
        value: option.value,
        inputDisplay: option.text,
      })),
    []
  );

  const handleChange = useCallback(
    (value: string) => {
      onTimeRangeChange(value);
    },
    [onTimeRangeChange]
  );

  return (
    <EuiSuperSelect
      data-test-subj="drift-time-range-filter"
      options={options}
      valueOfSelected={selectedTimeRange}
      onChange={handleChange}
      style={{ minWidth: 150 }}
    />
  );
};

export const DriftTimeRangeFilter = React.memo(DriftTimeRangeFilterComponent);
DriftTimeRangeFilter.displayName = 'DriftTimeRangeFilter';
