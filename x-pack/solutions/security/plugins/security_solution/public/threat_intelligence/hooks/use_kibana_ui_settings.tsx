/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import moment from 'moment-timezone';
import { DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT_TZ } from '../constants/common';

export const useDateFormat = (): string => useUiSetting<string>(DEFAULT_DATE_FORMAT);

export const useTimeZone = (): string => {
  const timeZone: string = useUiSetting<string>(DEFAULT_DATE_FORMAT_TZ);
  return timeZone === 'Browser' ? moment.tz.guess() : timeZone;
};
