/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export enum TIME_UNITS {
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'd',
}

export const getTimeUnitLabel = (timeUnit = TIME_UNITS.SECOND, timeValue = '0') => {
  switch (timeUnit) {
    case TIME_UNITS.SECOND:
      return i18n.SCHEDULE_TIME_UNITS_SECOND(timeValue);
    case TIME_UNITS.MINUTE:
      return i18n.SCHEDULE_TIME_UNITS_MINUTE(timeValue);
    case TIME_UNITS.HOUR:
      return i18n.SCHEDULE_TIME_UNITS_HOUR(timeValue);
    case TIME_UNITS.DAY:
      return i18n.SCHEDULE_TIME_UNITS_DAY(timeValue);
  }
};

export const getTimeOptions = (unitSize: number) => {
  return Object.entries(TIME_UNITS).map(([_, value]) => {
    return {
      text: getTimeUnitLabel(value, unitSize.toString()),
      value,
    };
  });
};
