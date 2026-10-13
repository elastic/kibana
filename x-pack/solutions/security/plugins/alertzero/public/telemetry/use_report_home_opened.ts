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
  /** Whether the queue's open count has arrived. */
  isLoaded: boolean;
  openCount: number;
}

/**
 * Reports `alertzero_ui_home_opened` once per mount, when the queue's open count first arrives.
 * A ref latch keeps refetches, window-focus polls and StrictMode's repeated effects from
 * reporting again.
 */
export const useReportHomeOpened = ({ isLoaded, openCount }: UseReportHomeOpenedParams): void => {
  const { reportEvent } = useAlertZeroTelemetry();
  const reported = useRef(false);

  useEffect(() => {
    if (!isLoaded || reported.current) {
      return;
    }
    reported.current = true;
    reportEvent(ALERTZERO_UI_EVENTS.HomeOpened, {
      // The queue has no saved filters yet, so it always opens with the defaults.
      default_filters_changed: false,
      queue_size_bucket: bucketQueueSize(openCount),
    });
  }, [isLoaded, openCount, reportEvent]);
};
