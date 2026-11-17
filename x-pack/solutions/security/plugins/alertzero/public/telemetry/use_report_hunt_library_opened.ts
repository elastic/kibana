/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { ALERTZERO_UI_EVENTS } from './constants';
import { useAlertZeroTelemetry } from './use_alertzero_telemetry';

export interface UseReportHuntLibraryOpenedParams {
  /** Absent until the hunt list has loaded. */
  huntCount: number | undefined;
  availableHuntCount: number;
}

/**
 * Reports `alertzero_ui_hunt_library_opened` once per mount, when the hunt list first arrives. A
 * ref latch keeps refetches and StrictMode's repeated effects from reporting again.
 */
export const useReportHuntLibraryOpened = ({
  huntCount,
  availableHuntCount,
}: UseReportHuntLibraryOpenedParams): void => {
  const { reportEvent } = useAlertZeroTelemetry();
  const reported = useRef(false);

  useEffect(() => {
    if (huntCount === undefined || reported.current) {
      return;
    }
    reported.current = true;
    reportEvent(ALERTZERO_UI_EVENTS.HuntLibraryOpened, {
      hunt_count: huntCount,
      available_hunt_count: availableHuntCount,
    });
  }, [huntCount, availableHuntCount, reportEvent]);
};
