/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertTimeDurationToMs } from '@kbn/securitysolution-utils/time_duration';
import type { TimeframePreviewOptions } from '../../../../detections/pages/detection_engine/rules/types';

export const usePreviewInvocationCount = ({
  timeframeOptions,
}: {
  timeframeOptions: TimeframePreviewOptions;
}) => {
  const timeframeDuration =
    (timeframeOptions.timeframeEnd.valueOf() / 1000 -
      timeframeOptions.timeframeStart.valueOf() / 1000) *
    1000;

  const intervalMs = convertTimeDurationToMs(timeframeOptions.interval ?? '');
  const lookBackMs = convertTimeDurationToMs(timeframeOptions.lookback ?? '');

  if (intervalMs === undefined) {
    return { invocationCount: 0, interval: timeframeOptions.interval, from: `now` };
  }

  const invocationCount = Math.max(Math.ceil(timeframeDuration / intervalMs), 1);

  if (lookBackMs === undefined) {
    return { invocationCount, interval: timeframeOptions.interval, from: `now` };
  }

  const fromSecs = Math.round((intervalMs + lookBackMs) / 1000);

  return { invocationCount, interval: timeframeOptions.interval, from: `now-${fromSecs}s` };
};
