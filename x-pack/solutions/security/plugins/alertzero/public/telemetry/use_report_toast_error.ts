/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { UiErrorClass, UiErrorSurface } from './constants';
import { ALERTZERO_UI_EVENTS } from './constants';
import { useAlertZeroTelemetry } from './use_alertzero_telemetry';

/** Reports one error toast; a toast is one occurrence, so every call reports. */
export type ReportToastError = (errorClass: UiErrorClass) => void;

/** Binds `alertzero_ui_error_shown` to the surface whose toasts it reports. */
export const useReportToastError = (surface: UiErrorSurface): ReportToastError => {
  const { reportEvent } = useAlertZeroTelemetry();
  return useCallback(
    (errorClass) =>
      reportEvent(ALERTZERO_UI_EVENTS.ErrorShown, { error_class: errorClass, surface }),
    [reportEvent, surface]
  );
};
