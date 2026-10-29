/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import numeral from '@elastic/numeral';
import moment from 'moment-timezone';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { FORMATS_UI_SETTINGS } from '@kbn/field-formats-plugin/common';
import { useKibanaServices } from './use_kibana_services';

export interface Formatters {
  /** A count or other number, with the `format:number:defaultPattern` advanced setting. */
  formatNumber: (value: number) => string;
  /** A share between 0 and 1, with the `format:percent:defaultPattern` advanced setting. */
  formatPercent: (share: number) => string;
  /** An absolute date, with the `dateFormat` and `dateFormat:tz` advanced settings. */
  formatDate: (date: string | number) => string;
  /** The `dateFormat:tz` advanced setting, as an IANA time zone (the browser's for `Browser`). */
  timeZone: string;
}

/**
 * Formats numbers and dates the way the user configured Kibana (Advanced Settings), as other
 * Observability apps do, so the page matches the rest of Kibana.
 */
export const useFormatters = (): Formatters => {
  const { uiSettings } = useKibanaServices();

  return useMemo(() => {
    const numberPattern = uiSettings.get<string>(FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN);
    const percentPattern = uiSettings.get<string>(
      FORMATS_UI_SETTINGS.FORMAT_PERCENT_DEFAULT_PATTERN
    );
    const dateFormat = uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT);
    const kibanaTimeZone = uiSettings.get<string>(UI_SETTINGS.DATEFORMAT_TZ);
    // Elastic Charts only accepts IANA names, so `Browser` becomes the browser's own time zone.
    const timeZone =
      !kibanaTimeZone || kibanaTimeZone === 'Browser' ? moment.tz.guess() : kibanaTimeZone;

    return {
      formatNumber: (value) => numeral(value).format(numberPattern),
      formatPercent: (share) => numeral(share).format(percentPattern),
      formatDate: (date) => moment(date).tz(timeZone).format(dateFormat),
      timeZone,
    };
  }, [uiSettings]);
};
