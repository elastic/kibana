/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import moment from 'moment';
import { GAP_DETECTED_EVENT } from '../../../../telemetry/event_based/events';
import { parseInterval } from '../utils';

export const sendGapDetectedTelemetryEvent = ({
  analytics,
  interval,
  gapDuration,
  originalFrom,
  originalTo,

}: {
  analytics: AnalyticsServiceSetup;
  interval: string;
  gapDuration: moment.Duration;
  originalFrom: moment.Moment;
  originalTo: moment.Moment;
}) => {

  const intervalDuration = parseInterval(interval);

  if (!intervalDuration) {
    return;
  }

  analytics.reportEvent(GAP_DETECTED_EVENT.eventType, {
    gapDuration: gapDuration.asMilliseconds(),
    intervalDuration: intervalDuration.asMilliseconds(),
    intervalAndLookbackDuration: moment.duration(originalTo.diff(originalFrom)).asMilliseconds(),
  });
};