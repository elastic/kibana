/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCHEDULE_TIME_UNITS_SECOND = (timeValue = '0') =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.timeUnits.secondLabel', {
    defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
    values: { timeValue },
  });

export const SCHEDULE_TIME_UNITS_MINUTE = (timeValue = '0') =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.timeUnits.minuteLabel', {
    defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
    values: { timeValue },
  });

export const SCHEDULE_TIME_UNITS_HOUR = (timeValue = '0') =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.timeUnits.hourLabel', {
    defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
    values: { timeValue },
  });

export const SCHEDULE_TIME_UNITS_DAY = (timeValue = '0') =>
  i18n.translate('xpack.securitySolution.attackDiscovery.schedule.timeUnits.dayLabel', {
    defaultMessage: '{timeValue, plural, one {day} other {days}}',
    values: { timeValue },
  });
