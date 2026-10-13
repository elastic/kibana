/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { UiErrorClass, UiErrorSurface } from './constants';
import { ALERTZERO_UI_EVENTS } from './constants';
import { useAlertZeroTelemetry } from './use_alertzero_telemetry';

export interface UseReportErrorShownParams {
  errorClass: UiErrorClass;
  /** Whether the error callout or prompt is on screen. */
  isShown: boolean;
  surface: UiErrorSurface;
}

/**
 * Reports `alertzero_ui_error_shown` for an error callout or prompt, once each time it appears:
 * re-renders and failed refetches while it stays visible are the same occurrence. A ref latch
 * keeps StrictMode's repeated effects from reporting twice.
 */
export const useReportErrorShown = ({
  errorClass,
  isShown,
  surface,
}: UseReportErrorShownParams): void => {
  const { reportEvent } = useAlertZeroTelemetry();
  const shown = useRef(false);

  useEffect(() => {
    if (!isShown) {
      shown.current = false;
      return;
    }
    if (shown.current) {
      return;
    }
    shown.current = true;
    reportEvent(ALERTZERO_UI_EVENTS.ErrorShown, { error_class: errorClass, surface });
  }, [errorClass, isShown, reportEvent, surface]);
};
