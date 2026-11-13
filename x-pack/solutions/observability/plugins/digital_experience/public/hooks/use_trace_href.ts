/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useKibanaServices } from './use_kibana_services';

const APM_APP_ID = 'apm';

/**
 * The link to a distributed trace in APM, or `undefined` when the user can't open APM, so that a
 * request's backend calls are a click away.
 */
export const useTraceHref = (): ((traceId: string | null) => string | undefined) => {
  const { application } = useKibanaServices();
  const canOpenApm = Boolean(application.capabilities[APM_APP_ID]?.show);

  return useCallback(
    (traceId) =>
      traceId && canOpenApm
        ? application.getUrlForApp(APM_APP_ID, {
            path: `/link-to/trace/${encodeURIComponent(traceId)}`,
          })
        : undefined,
    [application, canOpenApm]
  );
};
