/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { ConfigKey, type SelectedSyntheticsMonitor } from '../../../../../../common/runtime_types';
import { useSyntheticsRefreshContext } from '../../../contexts';
import {
  getMonitorAction,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  selectorMonitorDetailsState,
  selectSyntheticsMonitorError,
} from '../../../state';
import { useGetUrlParams } from '../../../hooks';
import { useRemoteMonitor } from './use_remote_monitor';

interface UseSelectedMonitorOptions {
  refetchMonitorEnabled?: boolean;
}

interface UseSelectedMonitorResult {
  monitor: SelectedSyntheticsMonitor | null;
  loading: boolean;
  error: ReturnType<typeof selectSyntheticsMonitorError>;
  isMonitorMissing: boolean;
}

export const useSelectedMonitor = ({
  refetchMonitorEnabled = true,
}: UseSelectedMonitorOptions = {}): UseSelectedMonitorResult => {
  const { monitorId } = useParams<{ monitorId: string }>();
  const { space } = useKibanaSpace();
  const { spaceId, remoteName } = useGetUrlParams();

  // Remote monitors have no local saved object — the local fetch would 404.
  // We compose `useRemoteMonitor` to synthesize identity from remote pings via CCS.
  const isRemote = Boolean(remoteName);

  const monitorsList = useSelector(selectEncryptedSyntheticsSavedMonitors);
  const { loading: monitorListLoading } = useSelector(selectMonitorListState);

  const monitorFromList = useMemo(
    () => monitorsList.find((monitor) => monitor[ConfigKey.CONFIG_ID] === monitorId) ?? null,
    [monitorId, monitorsList]
  );
  const error = useSelector(selectSyntheticsMonitorError);
  const { lastRefresh, refreshInterval } = useSyntheticsRefreshContext();
  const { syntheticsMonitor, syntheticsMonitorLoading, syntheticsMonitorDispatchedAt } =
    useSelector(selectorMonitorDetailsState);
  const dispatch = useDispatch();

  // Remote error is not propagated through this hook's `error` field for PR 2;
  // the local-monitor `error` is an HTTP-fetch error with `body.statusCode`,
  // whereas the remote error is a plain ES `Error`. Surface remote errors at
  // the data-fetching layer (later PRs) when those hooks gain CCS awareness.
  const { data: remoteMonitor, loading: remoteMonitorLoading } = useRemoteMonitor({
    configId: monitorId,
    remoteName,
  });

  const isMonitorFromListValid =
    monitorId && monitorFromList && monitorFromList[ConfigKey.CONFIG_ID] === monitorId;
  const isLoadedSyntheticsMonitorValid =
    monitorId && syntheticsMonitor && syntheticsMonitor[ConfigKey.CONFIG_ID] === monitorId;

  const availableLocalMonitor = isLoadedSyntheticsMonitorValid
    ? syntheticsMonitor
    : isMonitorFromListValid
    ? monitorFromList
    : null;

  const availableMonitor: SelectedSyntheticsMonitor | null = isRemote
    ? remoteMonitor ?? null
    : availableLocalMonitor;

  const isMonitorMissing =
    !isRemote &&
    error?.body?.statusCode === 404 &&
    (error.getPayload as { monitorId: string })?.monitorId === monitorId;

  useEffect(() => {
    if (
      monitorId &&
      !isRemote &&
      !availableMonitor &&
      !syntheticsMonitorLoading &&
      !isMonitorMissing
    ) {
      dispatch(
        getMonitorAction.get({
          monitorId,
          ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
        })
      );
    }
  }, [
    dispatch,
    monitorId,
    isRemote,
    availableMonitor,
    syntheticsMonitorLoading,
    isMonitorMissing,
    spaceId,
    space?.id,
  ]);

  useEffect(() => {
    // Only perform periodic refresh if the last dispatch was earlier enough
    if (
      monitorId &&
      !isRemote &&
      !syntheticsMonitorLoading &&
      !monitorListLoading &&
      syntheticsMonitorDispatchedAt > 0 &&
      Date.now() - syntheticsMonitorDispatchedAt > refreshInterval * 1000 &&
      refetchMonitorEnabled
    ) {
      dispatch(
        getMonitorAction.get({
          monitorId,
          ...(spaceId && spaceId !== space?.id ? { spaceId } : {}),
        })
      );
    }
  }, [
    dispatch,
    lastRefresh,
    refreshInterval,
    monitorId,
    isRemote,
    monitorListLoading,
    syntheticsMonitorLoading,
    syntheticsMonitorDispatchedAt,
    spaceId,
    space?.id,
    refetchMonitorEnabled,
  ]);

  return {
    monitor: availableMonitor,
    loading: isRemote ? remoteMonitorLoading : syntheticsMonitorLoading || monitorListLoading,
    error: isRemote ? null : error,
    isMonitorMissing,
  };
};
