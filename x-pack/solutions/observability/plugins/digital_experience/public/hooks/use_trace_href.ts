/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { APM_APP_ID } from '@kbn/deeplinks-observability';
import { useKibanaServices } from './use_kibana_services';

/**
 * How far either side of a request APM looks for its trace. Without a range, APM finds the root
 * transaction over all time but falls back to its default recent window when there is none, as for
 * a browser trace with no instrumented backend, which is empty for any session but a recent one.
 */
const TRACE_RANGE_MARGIN_MS = 5 * 60_000;

/**
 * The link to a distributed trace in APM, around the time of the request that made it, or
 * `undefined` when the user can't open APM, so that a request's backend calls are a click away.
 */
export const useTraceHref = (): ((
  traceId: string | null,
  request: { startTime: string; durationMs: number }
) => string | undefined) => {
  const { application } = useKibanaServices();
  const canOpenApm = Boolean(application.capabilities[APM_APP_ID]?.show);

  return useCallback(
    (traceId, { startTime, durationMs }) => {
      if (!traceId || !canOpenApm) {
        return undefined;
      }
      const startMs = Date.parse(startTime);
      const range = Number.isFinite(startMs)
        ? `?${new URLSearchParams({
            rangeFrom: new Date(startMs - TRACE_RANGE_MARGIN_MS).toISOString(),
            rangeTo: new Date(startMs + durationMs + TRACE_RANGE_MARGIN_MS).toISOString(),
          })}`
        : '';
      return application.getUrlForApp(APM_APP_ID, {
        path: `/link-to/trace/${encodeURIComponent(traceId)}${range}`,
      });
    },
    [application, canOpenApm]
  );
};
