/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
export const SHORT_TS_LOCALE = 'en-short-locale';

export const SHORT_TIMESPAN_LOCALE = {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '%ds',
    ss: '%ss',
    m: '%dm',
    mm: '%dm',
    h: '%dh',
    hh: '%dh',
    d: '%dd',
    dd: '%dd',
    M: '%d Mon',
    MM: '%d Mon',
    y: '%d Yr',
    yy: '%d Yr',
  },
};

export const parseTimestamp = (tsValue: string): Moment => {
  let parsed = Date.parse(tsValue);
  if (isNaN(parsed)) {
    parsed = parseInt(tsValue, 10);
  }
  return moment(parsed);
};

export const getShortTimeStamp = (timeStamp: moment.Moment, relative = false) => {
  if (relative) {
    const prevLocale: string = moment.locale() ?? 'en';

    const shortLocale = moment.locale(SHORT_TS_LOCALE) === SHORT_TS_LOCALE;

    if (!shortLocale) {
      moment.defineLocale(SHORT_TS_LOCALE, SHORT_TIMESPAN_LOCALE);
    }

    let shortTimestamp;
    if (typeof timeStamp === 'string') {
      shortTimestamp = parseTimestamp(timeStamp).fromNow();
    } else {
      shortTimestamp = timeStamp.fromNow();
    }

    // Reset it so, it doesn't impact other part of the app
    moment.locale(prevLocale);
    return shortTimestamp;
  } else {
    if (moment().diff(timeStamp, 'd') >= 1) {
      return timeStamp.format('ll LTS');
    }
    return timeStamp.format('LTS');
  }
};
