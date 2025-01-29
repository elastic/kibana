/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AVERAGE_TIME_IS_CALCULATED = (intervals: number) =>
  i18n.translate(
    'xpack.securitySolution.attackDiscovery.loadingCallout.countdown.lastTimesPopover.aiIsCurrentlyAnalyzing',
    {
      defaultMessage:
        'Remaining time is based on the average speed of the last {intervals} {intervals, plural, =1 {time} other {times}} the same connector generated results.',
      values: { intervals },
    }
  );

export const SECONDS_ABBREVIATION = i18n.translate(
  'xpack.securitySolution.attackDiscovery.loadingCallout.countdown.lastTimesPopover.secondsAbbreviationLabel',
  {
    defaultMessage: 's', // short for seconds
  }
);
