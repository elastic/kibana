/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment-timezone';
import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { NumberFormat, PercentFormat } from '@kbn/field-formats-plugin/common';
import { getTimeZone } from '@kbn/visualization-utils';
import { toElasticsearchTimeZone } from '../../common/time_zone';
import { useKibanaServices } from './use_kibana_services';

const COMPACT_NUMBER_PATTERN = '0,0.[0]';
const COMPACT_PERCENT_PATTERN = '0,0.[0]%';
const ERROR_RATE_PATTERN = '0,0.00';

export interface Formatters {
  /** A count or other number, with the `format:number:defaultPattern` advanced setting. */
  formatNumber: (value: number) => string;
  /** A share between 0 and 1, with the `format:percent:defaultPattern` advanced setting. */
  formatPercent: (share: number) => string;
  /** An error rate, always with two decimals in the user's number locale, e.g. "0.10". */
  formatErrorRate: (rate: number) => string;
  /** A share on a KPI tile, to one decimal at most, e.g. "42.4%": more reads as noise there. */
  formatKpiPercent: (share: number) => string;
  /** A change, to one decimal at most, with a sign unless it rounds to 0, e.g. "+1.5" or "0". */
  formatSignedNumber: (value: number) => string;
  /** A relative change, to one decimal at most, with a sign unless it rounds to 0, e.g. "-4.9%". */
  formatSignedPercent: (share: number) => string;
  /** An absolute date, with the `dateFormat` and `dateFormat:tz` advanced settings. */
  formatDate: (date: string | number) => string;
  /**
   * The `dateFormat:tz` advanced setting, as an IANA time zone (the browser's for `Browser`) that
   * Elasticsearch accepts, for the routes' histogram buckets.
   */
  timeZone: string;
}

/** The formatters of `uiSettings`, with Kibana's number and percent field formats. */
export const createFormatters = (uiSettings: IUiSettingsClient): Formatters => {
  const getConfig: FieldFormatsGetConfigFn = (key, defaultOverride) =>
    uiSettings.get(key, defaultOverride);
  const number = new NumberFormat({}, getConfig);
  const percent = new PercentFormat({}, getConfig);
  // Changes and KPI shares to one decimal at most, whatever the default patterns: "-4.949%" reads
  // as noise on a tile.
  const kpiPercent = new PercentFormat({ pattern: COMPACT_PERCENT_PATTERN }, getConfig);
  const errorRate = new NumberFormat({ pattern: ERROR_RATE_PATTERN }, getConfig);
  const signedNumber = new NumberFormat(
    { alwaysShowSign: true, pattern: COMPACT_NUMBER_PATTERN },
    getConfig
  );
  const signedPercent = new PercentFormat(
    { alwaysShowSign: true, pattern: COMPACT_PERCENT_PATTERN },
    getConfig
  );
  const dateFormat = uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT);
  // As Lens charts do: always a zone name, `Browser` the browser's, never a UTC offset moment.tz
  // can't use
  const timeZone = toElasticsearchTimeZone(getTimeZone(uiSettings));

  return {
    formatNumber: (value) => number.convertToText(value),
    formatPercent: (share) => percent.convertToText(share),
    formatErrorRate: (rate) => errorRate.convertToText(rate),
    formatKpiPercent: (share) => kpiPercent.convertToText(share),
    formatSignedNumber: (value) => signedNumber.convertToText(value),
    formatSignedPercent: (share) => signedPercent.convertToText(share),
    formatDate: (date) => moment(date).tz(timeZone).format(dateFormat),
    timeZone,
  };
};

/**
 * Formats numbers and dates the way the user configured Kibana (Advanced Settings), as other
 * Observability apps do, so the page matches the rest of Kibana.
 */
export const useFormatters = (): Formatters => {
  const { uiSettings } = useKibanaServices();
  return useMemo(() => createFormatters(uiSettings), [uiSettings]);
};
