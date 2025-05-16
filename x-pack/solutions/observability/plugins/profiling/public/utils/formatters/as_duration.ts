/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import moment from 'moment';

moment.relativeTimeRounding((t) => {
  const DIGITS = 2; // like: 2.56 minutes
  return Math.round(t * Math.pow(10, DIGITS)) / Math.pow(10, DIGITS);
});
moment.relativeTimeThreshold('y', 365);
moment.relativeTimeThreshold('M', 12);
moment.relativeTimeThreshold('w', 4);
moment.relativeTimeThreshold('d', 31);
moment.relativeTimeThreshold('h', 24);
moment.relativeTimeThreshold('m', 60);
moment.relativeTimeThreshold('s', 60);
moment.relativeTimeThreshold('ss', 0);

export function asDuration(valueInSeconds: number) {
  if (valueInSeconds === 0) {
    return i18n.translate('xpack.profiling.zeroSeconds', { defaultMessage: '0 seconds' });
  }
  return moment.duration(valueInSeconds * 1000).humanize();
}
