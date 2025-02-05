/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';

const invalidDateText = i18n.translate(
  'xpack.securitySolution.enpdoint.resolver.panelutils.invaliddate',
  {
    defaultMessage: 'Invalid Date',
  }
);

/**
 * Long formatter (to second) for DateTime
 */
const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/**
 *
 * @description formats a given time based on the user defined format in the advanced settings section of kibana under dateFormat
 * @export
 * @param {(ConstructorParameters<typeof Date>[0] | undefined)} timestamp
 * @returns {(string | null)} - Either a formatted date or the text 'Invalid Date'
 */
export function useFormattedDate(
  timestamp: ConstructorParameters<typeof Date>[0] | Date | undefined
): string | undefined {
  const dateFormatSetting: string = useUiSetting('dateFormat');
  const timezoneSetting: string = useUiSetting('dateFormat:tz');
  const usableTimezoneSetting = timezoneSetting === 'Browser' ? moment.tz.guess() : timezoneSetting;

  if (!timestamp) return undefined;

  const date = new Date(timestamp);
  if (date && Number.isFinite(date.getTime())) {
    return dateFormatSetting
      ? moment.tz(date, usableTimezoneSetting).format(dateFormatSetting)
      : formatter.format(date);
  }

  return invalidDateText;
}
