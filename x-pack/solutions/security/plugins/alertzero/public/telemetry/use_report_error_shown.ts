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
  /**
   * Whether the failed request is being fetched again. A query without data drops its error while
   * it refetches, so the prompt hides until the retry settles; that is still the same failure.
   */
  isRefetching?: boolean;
  /**
   * What the failing request was for, such as a Watch id. A page that stays mounted while it
   * loads something else starts a new occurrence when this changes, even mid-fetch.
   */
  resetKey?: string;
  surface: UiErrorSurface;
}

/**
 * Reports `alertzero_ui_error_shown` for an error callout or prompt, once per failure: re-renders,
 * and refetches that fail again, are the same occurrence. It reports again only after the error
 * went away without a refetch in flight, or after `resetKey` changed. A ref latch keeps
 * StrictMode's repeated effects from reporting twice.
 */
export const useReportErrorShown = ({
  errorClass,
  isShown,
  isRefetching = false,
  resetKey,
  surface,
}: UseReportErrorShownParams): void => {
  const { reportEvent } = useAlertZeroTelemetry();
  const shown = useRef(false);
  const shownFor = useRef(resetKey);

  useEffect(() => {
    if (shownFor.current !== resetKey) {
      shownFor.current = resetKey;
      shown.current = false;
    }
    if (!isShown) {
      if (!isRefetching) {
        shown.current = false;
      }
      return;
    }
    if (shown.current) {
      return;
    }
    shown.current = true;
    reportEvent(ALERTZERO_UI_EVENTS.ErrorShown, { error_class: errorClass, surface });
  }, [errorClass, isRefetching, isShown, reportEvent, resetKey, surface]);
};
