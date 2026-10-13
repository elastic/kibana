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
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '../hooks/use_automation_usage';
import { listLabels } from './translations';

const PRESETS: NonNullable<DateRangePickerProps['presets']> = [
  {
    start: 'now/d',
    end: 'now/d',
    label: i18n.translate('xpack.nightshift.automations.timeRange.today', {
      defaultMessage: 'Today',
    }),
  },
  {
    start: 'now-1d/d',
    end: 'now-1d/d',
    label: i18n.translate('xpack.nightshift.automations.timeRange.yesterday', {
      defaultMessage: 'Yesterday',
    }),
  },
  {
    start: 'now-15m',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last15Minutes', {
      defaultMessage: 'Last 15 minutes',
    }),
  },
  {
    start: 'now-30m',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last30Minutes', {
      defaultMessage: 'Last 30 minutes',
    }),
  },
  {
    start: 'now-1h',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last1Hour', {
      defaultMessage: 'Last 1 hour',
    }),
  },
  {
    start: 'now-12h',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last12Hours', {
      defaultMessage: 'Last 12 hours',
    }),
  },
  {
    start: 'now-24h',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last24Hours', {
      defaultMessage: 'Last 24 hours',
    }),
  },
  {
    start: 'now-48h',
    end: 'now',
    label: listLabels.last48Hours,
  },
  {
    start: 'now-7d',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last7Days', {
      defaultMessage: 'Last 7 days',
    }),
  },
  {
    start: 'now-30d',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last30Days', {
      defaultMessage: 'Last 30 days',
    }),
  },
  {
    start: 'now-90d',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last90Days', {
      defaultMessage: 'Last 90 days',
    }),
  },
  {
    start: 'now-1y',
    end: 'now',
    label: i18n.translate('xpack.nightshift.automations.timeRange.last1Year', {
      defaultMessage: 'Last 1 year',
    }),
  },
];

export const AutomationsTimeRangePicker = ({
  onRangeChange,
  onRefresh,
}: {
  onRangeChange: (range: TimeRange, label: string) => void;
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
    const preset = PRESETS.find((option) => option.start === start && option.end === end);
    onRangeChange(
      { start, end },
      preset?.label ?? nextValue.charAt(0).toUpperCase() + nextValue.slice(1)
    );
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
