/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SECONDS_SCREEN_READER = (value: number) =>
  i18n.translate('xpack.securitySolution.accessibility.intervalAbbrScreenReader.seconds', {
    defaultMessage: '{value} {value, plural, one { second } other { seconds }}',
    values: {
      value,
    },
  });

export const MINUTES_SCREEN_READER = (value: number) =>
  i18n.translate('xpack.securitySolution.accessibility.intervalAbbrScreenReader.minutes', {
    defaultMessage: '{value} {value, plural, one { minute } other { minutes }}',
    values: {
      value,
    },
  });

export const HOURS_SCREEN_READER = (value: number) =>
  i18n.translate('xpack.securitySolution.accessibility.intervalAbbrScreenReader.hours', {
    defaultMessage: '{value} {value, plural, one { hour } other { hours }}',
    values: {
      value,
    },
  });
