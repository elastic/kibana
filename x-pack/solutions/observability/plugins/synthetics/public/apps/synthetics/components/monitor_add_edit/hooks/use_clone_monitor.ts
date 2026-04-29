/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';
import { useGetUrlParams } from '../../../hooks';

export const useCloneMonitor = () => {
  const { cloneId } = useGetUrlParams();
  return useFetcher(() => {
    if (!cloneId) return Promise.resolve(undefined);
    return fetchSyntheticsMonitor({ monitorId: cloneId });
  }, [cloneId]);
};
