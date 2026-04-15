/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { usePluginContext } from './use_plugin_context';

export function useRequestCompositeSloSummaryOnListVisit(): void {
  const { sloClient } = usePluginContext();
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) {
      return;
    }
    requestedRef.current = true;

    void sloClient
      .fetch('POST /internal/observability/slos/_composite_summary/refresh', {
        params: { body: {} },
      })
      .catch(() => {});
  }, [sloClient]);
}
