/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerProps,
  type DateRangePickerSettings,
} from '@kbn/date-range-picker';
import type { TimeRange } from '../hooks/use_automation_usage';
import { listLabels } from './translations';

const PRESETS: NonNullable<DateRangePickerProps['presets']> = [
  { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
  { start: 'now-48h', end: 'now', label: listLabels.last48Hours },
  { start: 'now-7d', end: 'now', label: 'Last 7 days' },
  { start: 'now-30d', end: 'now', label: 'Last 30 days' },
];

export const AutomationsTimeRangePicker = ({
  onRangeChange,
  onRefresh,
}: {
  onRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
}) => {
  const [value, setValue] = useState(listLabels.last48Hours);
  const [isInvalid, setIsInvalid] = useState(false);
  const [settings, setSettings] = useState<DateRangePickerSettings>({ roundRelativeTime: false });

  const handleChange = ({
    start,
    end,
    value: nextValue,
    isInvalid: invalid,
  }: DateRangePickerOnChangeProps) => {
    setValue(nextValue);
    setIsInvalid(invalid);
    if (invalid) return;
    onRangeChange({ start, end });
  };

  return (
    <DateRangePicker
      value={value}
      onChange={handleChange}
      onInputChange={() => setIsInvalid(false)}
      isInvalid={isInvalid}
      presets={PRESETS}
      settings={settings}
      onSettingsChange={setSettings}
      onRefresh={onRefresh}
      compressed
      width="auto"
      data-test-subj="automationsTimeRangePicker"
    />
  );
};
