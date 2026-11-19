/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertZeroUiEventType } from './constants';
import type { AlertZeroUiEventPayloads } from './events';

export type ReportAlertZeroUiEvent = <T extends AlertZeroUiEventType>(
  eventType: T,
  payload: AlertZeroUiEventPayloads[T]
) => void;

export interface AlertZeroTelemetry {
  reportEvent: ReportAlertZeroUiEvent;
}

/**
 * Reports AlertZero browser events through core analytics, which honors the telemetry opt-in.
 * Reporting never throws: a telemetry problem must never break the page.
 */
export const useAlertZeroTelemetry = (): AlertZeroTelemetry => {
  const {
    services: { analytics },
  } = useKibana<Pick<CoreStart, 'analytics'>>();

  const reportEvent = useCallback<ReportAlertZeroUiEvent>(
    (eventType, payload) => {
      try {
        analytics?.reportEvent(eventType, payload);
      } catch {
        // Telemetry is best-effort.
      }
    },
    [analytics]
  );

  return { reportEvent };
};
