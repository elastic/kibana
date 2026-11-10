/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { SyntheticsMonitorWithId } from '../../../../../../common/runtime_types';
import { ConfigKey } from '../../../../../../common/runtime_types';
import { fetchSyntheticsMonitor } from '../../../state/monitor_details/api';
import { useGetUrlParams } from '../../../hooks';
import { useCanRevealParameterValues } from '../../../../../hooks/use_capabilities';

export const prepareMonitorForClone = (
  monitor: SyntheticsMonitorWithId,
  canRevealParams: boolean
): { monitor: SyntheticsMonitorWithId; paramsOmitted: boolean } => {
  const paramsOmitted = !canRevealParams && Boolean(monitor[ConfigKey.PARAMS]);
  return {
    monitor: paramsOmitted ? { ...monitor, [ConfigKey.PARAMS]: '' } : monitor,
    paramsOmitted,
  };
};

export const useCloneMonitor = () => {
  const { cloneId } = useGetUrlParams();
  const canRevealParams = useCanRevealParameterValues();
  const { data, ...cloneMonitor } = useFetcher(async () => {
    if (!cloneId) return Promise.resolve(undefined);
    const monitor = await fetchSyntheticsMonitor({ monitorId: cloneId });
    return prepareMonitorForClone(monitor, canRevealParams);
  }, [canRevealParams, cloneId]);

  return {
    ...cloneMonitor,
    data: data?.monitor,
    paramsOmitted: data?.paramsOmitted ?? false,
  };
};
