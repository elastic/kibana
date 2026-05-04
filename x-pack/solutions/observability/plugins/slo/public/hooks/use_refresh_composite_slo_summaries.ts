/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useMutation } from '@kbn/react-query';
import { usePluginContext } from './use_plugin_context';

export function useRefreshCompositeSloSummaries(): void {
  const { sloClient } = usePluginContext();

  const { mutate } = useMutation(['requestCompositeSloSummaryRefresh'], () =>
    sloClient.fetch('POST /internal/observability/slos/_composite_summary/refresh')
  );

  useEffect(() => {
    mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
