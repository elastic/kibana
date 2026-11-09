/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperUpdateButton } from '@elastic/eui';
import {
  DateRangePicker,
  type DateRangePickerOnChangeProps,
  type DateRangePickerSettings,
  type FirstDayOfWeek,
} from '@kbn/date-range-picker';
import { useDateRangePickerPresets, type PresetItem } from '@kbn/date-range-picker-presets';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs';
import { useKibana } from '../../hooks/use_kibana';

const DEFAULT_SETTINGS: DateRangePickerSettings = {
  roundRelativeTime: false,
};

const REFRESH_LABEL = i18n.translate('xpack.nightshift.timeRangePicker.refreshLabel', {
  defaultMessage: 'Refresh',
});

const toRecentRanges = (ranges: Array<{ from: string; to: string }>): PresetItem[] =>
  ranges.map(({ from, to }) => ({ start: from, end: to }));

export interface NightshiftTimeRangePickerProps {
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
  showRefreshButton?: boolean;
  'data-test-subj': string;
}

export const NightshiftTimeRangePicker = ({
  start,
  end,
  onChange,
  showRefreshButton = false,
  'data-test-subj': dataTestSubj,
}: NightshiftTimeRangePickerProps): React.ReactElement => {
  const { application, data, http, notifications, uiSettings } = useKibana().services;
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<DateRangePickerSettings>(DEFAULT_SETTINGS);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resolveEpoch, setResolveEpoch] = useState(0);
  const dateRangePickerPresets = useDateRangePickerPresets({
    service: data.dateRangePickerPresets,
    persistenceEnabled: true,
    notifications,
  });
  const timeHistory = data.query.timefilter.history;
  const recentRanges$ = useMemo(() => timeHistory.get$().pipe(map(toRecentRanges)), [timeHistory]);
  const recentRanges = useObservable(recentRanges$, toRecentRanges(timeHistory.get()));
  const timeZone = uiSettings.get<string>('dateFormat:tz', 'Browser');
  const dayOfWeekSetting = uiSettings.get<string>('dateFormat:dow');
  const dateFormat = uiSettings.get<string>('dateFormat');
  const inputDateFormats = useMemo(() => (dateFormat ? [dateFormat] : undefined), [dateFormat]);
  const calendarOptions = useMemo(
    () => ({
      firstDayOfWeek: moment.weekdays().indexOf(dayOfWeekSetting) as FirstDayOfWeek,
    }),
    [dayOfWeekSetting]
  );
  const canAccessAdvancedSettings =
    (application.capabilities.advancedSettings?.save as boolean | undefined) ?? false;

  const handleChange = useCallback(
    ({
      start: nextStart,
      end: nextEnd,
      isInvalid: nextIsInvalid,
    }: DateRangePickerOnChangeProps) => {
      setIsInvalid(nextIsInvalid);
      if (nextIsInvalid) {
        return;
      }
      onChange({ start: nextStart, end: nextEnd });
      timeHistory.add({ from: nextStart, to: nextEnd });
    },
    [onChange, timeHistory]
  );

  const handleRefresh = useCallback(() => {
    setResolveEpoch((epoch) => epoch + 1);
    setIsRefreshing(true);
    void queryClient.refetchQueries({ type: 'active' }).finally(() => setIsRefreshing(false));
  }, [queryClient]);

  const picker = (
    <DateRangePicker
      value={`${start} to ${end}`}
      onChange={handleChange}
      onInputChange={() => setIsInvalid(false)}
      isInvalid={isInvalid}
      presets={dateRangePickerPresets.presets}
      recent={recentRanges}
      onPresetSave={dateRangePickerPresets.onPresetSave}
      onPresetDelete={dateRangePickerPresets.onPresetDelete}
      settings={settings}
      onSettingsChange={setSettings}
      timeZone={timeZone}
      calendarOptions={calendarOptions}
      inputDateFormats={inputDateFormats}
      prependBasePath={http.basePath.prepend}
      canAccessAdvancedSettings={canAccessAdvancedSettings}
      resolveEpoch={resolveEpoch}
      compressed
      width="auto"
      data-test-subj={dataTestSubj}
    />
  );

  if (!showRefreshButton) {
    return picker;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>{picker}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperUpdateButton
          iconOnly
          fill={false}
          size="s"
          aria-label={REFRESH_LABEL}
          onClick={handleRefresh}
          isLoading={isRefreshing}
          showTooltip={false}
          toolTipProps={{ content: REFRESH_LABEL, disableScreenReaderOutput: true }}
          data-test-subj={`${dataTestSubj}-refresh`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
