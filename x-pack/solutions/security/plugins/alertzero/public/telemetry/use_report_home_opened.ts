/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { bucketQueueSize } from './bucket_queue_size';
import { ALERTZERO_UI_EVENTS } from './constants';
import { useAlertZeroTelemetry } from './use_alertzero_telemetry';

export interface UseReportHomeOpenedParams {
  /** Whether the queue's open count has arrived or failed to load. */
  isSettled: boolean;
  /** Absent when the count failed to load. */
  openCount: number | undefined;
}

/**
 * Reports `alertzero_ui_home_opened` once per mount, when the queue's open count first arrives or
 * fails to load (`unknown`). A ref latch keeps refetches, window-focus polls, a retry that loads
 * the count and StrictMode's repeated effects from reporting again.
 */
export const useReportHomeOpened = ({ isSettled, openCount }: UseReportHomeOpenedParams): void => {
  const { reportEvent } = useAlertZeroTelemetry();
  const reported = useRef(false);

  useEffect(() => {
    if (!isSettled || reported.current) {
      return;
    }
    reported.current = true;
    reportEvent(ALERTZERO_UI_EVENTS.HomeOpened, {
      // The queue has no saved filters yet, so it always opens with the defaults.
      default_filters_changed: false,
      queue_size_bucket: openCount === undefined ? 'unknown' : bucketQueueSize(openCount),
    });
  }, [isSettled, openCount, reportEvent]);
};
