/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUpsertMonitorAction } from '../state/monitor_list/actions';
import { ConfigKey } from '../components/monitors_page/overview/types';
import { selectMonitorUpsertStatuses } from '../state';

export interface EnableStateMonitorLabels {
  failureLabel: string;
  enabledSuccessLabel: string;
  disabledSuccessLabel: string;
}

export function useMonitorEnableHandler({
  configId,
  reloadPage,
  labels,
}: {
  configId: string;
  isEnabled: boolean;
  reloadPage?: () => void;
  labels: EnableStateMonitorLabels;
}) {
  const dispatch = useDispatch();
  const upsertStatuses = useSelector(selectMonitorUpsertStatuses);
  const status: FETCH_STATUS | undefined = upsertStatuses[configId]?.status;
  const [nextEnabled, setNextEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setNextEnabled(null);
  }, [configId]);

  useEffect(() => {
    if (status === FETCH_STATUS.FAILURE) {
      setNextEnabled(null);
    }
  }, [setNextEnabled, status]);

  const updateMonitorEnabledState = useCallback(
    (enabled: boolean) => {
      dispatch(
        fetchUpsertMonitorAction({
          configId,
          monitor: { [ConfigKey.ENABLED]: enabled },
          success: {
            message: enabled ? labels.enabledSuccessLabel : labels.disabledSuccessLabel,
            lifetimeMs: 3000,
            testAttribute: 'uptimeMonitorEnabledUpdateSuccess',
          },
          error: {
            message: {
              title: labels.failureLabel,
            },
            lifetimeMs: 10000,
            testAttribute: 'uptimeMonitorEnabledUpdateFailure',
          },
        })
      );
      setNextEnabled(enabled);
      if (reloadPage) reloadPage();
    },
    [
      dispatch,
      configId,
      labels.disabledSuccessLabel,
      labels.enabledSuccessLabel,
      labels.failureLabel,
      setNextEnabled,
      reloadPage,
    ]
  );

  return { isEnabled: nextEnabled, updateMonitorEnabledState, status };
}
