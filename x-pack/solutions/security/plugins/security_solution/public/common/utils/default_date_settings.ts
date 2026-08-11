/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import { isBoolean, isNumber, isString } from 'lodash/fp';
import {
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_FROM,
  DEFAULT_INTERVAL_TYPE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_TO,
} from '../../../common/constants';
import { KibanaServices } from '../lib/kibana';
import type { Policy } from '../store/inputs/model';

interface DefaultTimeRange {
  from?: string | null;
  to?: string | null;
}

interface DefaultInterval {
  pause?: boolean | null;
  value?: number | null;
}

export type DefaultTimeRangeSetting = DefaultTimeRange | null | undefined;
export type DefaultIntervalSetting = DefaultInterval | null | undefined;

// Defaults for if everything fails including dateMath.parse(DEFAULT_FROM) or dateMath.parse(DEFAULT_TO)
// These should not really be hit unless we are in an extreme buggy state.
export const DEFAULT_FROM_MOMENT = moment().subtract(24, 'hours');
export const DEFAULT_TO_MOMENT = moment();

/**
 * Retrieves timeRange settings to populate filters
 *
 * @param {Boolean} uiSettings Whether to respect the user's UI settings. Defaults to true.
 */
export const getTimeRangeSettings = (uiSettings = true) => {
  const timeRange = uiSettings
    ? KibanaServices.get().uiSettings.get<DefaultTimeRangeSetting>(DEFAULT_APP_TIME_RANGE)
    : null;

  const fromStr = (isString(timeRange?.from) && timeRange?.from) || DEFAULT_FROM;
  const toStr = (isString(timeRange?.to) && timeRange?.to) || DEFAULT_TO;
  const from = parseDateWithDefault(fromStr, DEFAULT_FROM_MOMENT).toISOString();
  const to = parseDateWithDefault(toStr, DEFAULT_TO_MOMENT, true).toISOString();

  const valueReport = {
    kind: 'relative' as const,
    fromStr: 'now-1M',
    toStr: 'now',
    from: parseDateWithDefault('now-1M', moment().subtract(1, 'month')).toISOString(),
    to: parseDateWithDefault('now', DEFAULT_TO_MOMENT, true).toISOString(),
  };

  return { from, fromStr, to, toStr, valueReport };
};

/**
 * Retrieves refreshInterval settings to populate filters
 *
 * @param {Boolean} uiSettings Whether to respect the user's UI settings. Defaults to true.
 */
export const getIntervalSettings = (uiSettings = true): Policy => {
  const interval = uiSettings
    ? KibanaServices.get().uiSettings.get<DefaultIntervalSetting>(DEFAULT_APP_REFRESH_INTERVAL)
    : null;

  const duration = (isNumber(interval?.value) && interval?.value) || DEFAULT_INTERVAL_VALUE;
  const kind = isBoolean(interval?.pause) && !interval?.pause ? 'interval' : DEFAULT_INTERVAL_TYPE;

  return { kind, duration };
};

/**
 * Parses a date and returns the default if the date string is not valid.
 * @param dateString The date string to parse
 * @param defaultDate The defaultDate if we cannot parse the dateMath
 * @param {Boolean} roundUp should relative timeranges be rounded up or down
 * @param momentInstance A moment instance to use in place of the library's, will use independent locale settings.
 * @param {Date} forceNow A valid date object to use in place of Date.now()
 * @returns The moment of the date time parsed
 */
export const parseDateWithDefault = (
  dateString: string,
  defaultDate: moment.Moment,
  roundUp: boolean = false,
  momentInstance?: typeof moment,
  forceNow?: Date
): moment.Moment => {
  const date = dateMath.parse(dateString, { roundUp, momentInstance, forceNow });
  if (date != null && date.isValid()) {
    return date;
  } else {
    return defaultDate;
  }
};
