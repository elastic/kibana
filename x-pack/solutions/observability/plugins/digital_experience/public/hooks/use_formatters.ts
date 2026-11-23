/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import moment from 'moment-timezone';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getUserTimeZone } from '@kbn/data-plugin/common';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { FieldFormatsGetConfigFn } from '@kbn/field-formats-plugin/common';
import { NumberFormat, PercentFormat } from '@kbn/field-formats-plugin/common';
import { useKibanaServices } from './use_kibana_services';

// Every `moment.tz.names()` entry (and so `dateFormat:tz` option) that an Elasticsearch 9.7
// `date_histogram` rejects, as the zone it links to.
const ES_TIME_ZONE_OF: Readonly<Record<string, string>> = {
  EST: 'America/Panama',
  HST: 'Pacific/Honolulu',
  MST: 'America/Phoenix',
  ROC: 'Asia/Taipei',
};

export interface Formatters {
  /** A count or other number, with the `format:number:defaultPattern` advanced setting. */
  formatNumber: (value: number) => string;
  /** A share between 0 and 1, with the `format:percent:defaultPattern` advanced setting. */
  formatPercent: (share: number) => string;
  /** `formatNumber` with a sign unless it rounds to 0, e.g. "+1.5", "-1.5" or "0". */
  formatSignedNumber: (value: number) => string;
  /** `formatPercent` with a sign unless it rounds to 0, e.g. "+20%", "-20%" or "0%". */
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
  const signedNumber = new NumberFormat({ alwaysShowSign: true }, getConfig);
  const signedPercent = new PercentFormat({ alwaysShowSign: true }, getConfig);
  const dateFormat = uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT);
  // As Kibana's own date histograms do: `Browser` becomes the browser's IANA time zone.
  const userTimeZone = getUserTimeZone((key) => uiSettings.get(key));
  const timeZone = ES_TIME_ZONE_OF[userTimeZone] ?? userTimeZone;

  return {
    formatNumber: (value) => number.convertToText(value),
    formatPercent: (share) => percent.convertToText(share),
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
