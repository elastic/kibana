/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { invert } from 'lodash';
import { scheduleToSeconds } from '../../../../../common/lib/schedule_to_time';
import type { ServiceLocations } from '../../../../../common/runtime_types';
import { MonitorTypeEnum, ScheduleUnit } from '../../../../../common/runtime_types';
import type { MonitorFilterState } from '../../state';

export type SyntheticsMonitorFilterField = keyof Omit<
  MonitorFilterState,
  | 'query'
  | 'monitorQueryIds'
  | 'showFromAllSpaces'
  | 'includeHeartbeatMonitors'
  | 'dateRangeStart'
  | 'dateRangeEnd'
>;

export interface LabelWithCountValue {
  label: string;
  count: number;
}

export interface SyntheticsMonitorFilterItem {
  label: string;
  values: LabelWithCountValue[];
  field: SyntheticsMonitorFilterField;
}

export function getMonitorFilterFields(): SyntheticsMonitorFilterField[] {
  return [
    'tags',
    'locations',
    'monitorTypes',
    'projects',
    'schedules',
    'remoteNames',
    'useLogicalAndFor',
  ];
}

export type SyntheticsMonitorFilterChangeHandler = (
  field: SyntheticsMonitorFilterField,
  selectedValues: string[] | undefined,
  isLogicalAND?: boolean
) => void;

export function getSyntheticsFilterDisplayValues(
  values: LabelWithCountValue[],
  field: SyntheticsMonitorFilterField,
  locations: ServiceLocations
) {
  switch (field) {
    case 'monitorTypes':
      return values.map(({ label, count }: { label: string; count: number }) => ({
        label: monitorTypeKeyLabelMap[label as MonitorTypeEnum] ?? label,
        count,
      }));
    case 'schedules':
      return values.map(({ label, count }: { label: string; count: number }) => ({
        label: scheduleFrequencyDisplayLabel(label),
        count,
      }));
    case 'locations':
      return values.map(({ label, count }) => {
        const foundLocation = locations.find(
          ({ id: locationId, label: locationLabel }) =>
            label === locationId || label === locationLabel
        );
        return {
          label: foundLocation?.label ?? label,
          count,
        };
      });
    default:
      return values;
  }
}

export function getSyntheticsFilterKeyForLabel(value: string, field: SyntheticsMonitorFilterField) {
  switch (field) {
    case 'monitorTypes':
      return invert(monitorTypeKeyLabelMap)[value] ?? value;
    case 'schedules':
      return scheduleKeyForLabel(value);
    default:
      return value;
  }
}

export const valueToLabelWithEmptyCount = (value?: string | string[]): LabelWithCountValue[] => {
  if (Array.isArray(value)) {
    return value.map((v) => ({ label: v, count: 0 }));
  }
  return value ? [{ label: value, count: 0 }] : [];
};

/** A bare number is minutes, matching older filter URLs. */
const parseScheduleFilterKey = (
  value: string
): { number: string; unit: ScheduleUnit } | undefined => {
  const match = /^(\d+)([sm])?$/.exec(value);
  if (!match) {
    return undefined;
  }
  return {
    number: match[1],
    unit: match[2] === ScheduleUnit.SECONDS ? ScheduleUnit.SECONDS : ScheduleUnit.MINUTES,
  };
};

const scheduleFrequencyLabel = (count: number, unit: ScheduleUnit): string => {
  if (unit === ScheduleUnit.SECONDS) {
    return i18n.translate('xpack.synthetics.monitorFilters.frequencyInSecondsLabel', {
      defaultMessage: 'Every {count} {count, plural, one {second} other {seconds}}',
      values: { count },
    });
  }
  return i18n.translate('xpack.synthetics.monitorFilters.frequencyInMinutesLabel', {
    defaultMessage: 'Every {count} {count, plural, one {minute} other {minutes}}',
    values: { count },
  });
};

const scheduleFrequencyDisplayLabel = (value: string): string => {
  const parsed = parseScheduleFilterKey(value);
  return parsed ? scheduleFrequencyLabel(Number(parsed.number), parsed.unit) : value;
};

const scheduleFilterDuration = (value: string): number => {
  const parsed = parseScheduleFilterKey(value);
  return parsed ? scheduleToSeconds(parsed) : Number.POSITIVE_INFINITY;
};

/** Dropdown-only. Selected pills pair each display label with the URL value at the same index. */
export const sortScheduleFilterValues = (values: LabelWithCountValue[]): LabelWithCountValue[] =>
  [...values].sort(
    (left, right) => scheduleFilterDuration(left.label) - scheduleFilterDuration(right.label)
  );

const scheduleKeyForLabel = (value: string): string => {
  const parsed = parseScheduleFilterKey(value ?? '');
  if (parsed) {
    return `${parsed.number}${parsed.unit}`;
  }

  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  const count = Number(digits);
  const unit =
    value === scheduleFrequencyLabel(count, ScheduleUnit.SECONDS)
      ? ScheduleUnit.SECONDS
      : ScheduleUnit.MINUTES;
  return `${digits}${unit}`;
};

export const monitorTypeKeyLabelMap: Record<MonitorTypeEnum, string> = {
  [MonitorTypeEnum.BROWSER]: 'Browser / Page',
  [MonitorTypeEnum.HTTP]: 'HTTP',
  [MonitorTypeEnum.TCP]: 'TCP',
  [MonitorTypeEnum.ICMP]: 'ICMP',
  [MonitorTypeEnum.API]: 'API Journey',
};
