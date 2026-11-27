/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { SignificantEventsWorkflowStatus } from '@kbn/significant-events-schema';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getNightshiftCapabilities } from '@kbn/nightshift-shared';
import { useKibana } from '../../hooks/use_kibana';
import { NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY } from '../significant_events/use_fetch_significant_events';
import { useSignificantEventsDiscoveryApi } from './use_significant_events_discovery_api';
import { getFormattedError } from '../../common/errors';
import { RUNNING_POLL_INTERVAL_MS } from '../../common/constants';
import {
  DETECTION_ENTITIES_QUERY_KEY,
  DETECTION_OVERVIEW_QUERY_KEY,
  DETECTIONS_LIST_QUERY_KEY,
  EVENT_BY_ID_QUERY_KEY,
  EVENT_LIFECYCLE_QUERY_KEY,
  SIGNIFICANT_EVENTS_FACETS_QUERY_KEY,
  SIGNIFICANT_EVENTS_LIST_QUERY_KEY,
} from '../query_keys';

const TERMINAL_STATUS_TOAST_DELAY_MS = 5 * 1000;
// Records, per execution id, the last terminal status we already notified about.
// Stored in the (app-level) QueryClient cache so it survives the page remount
// that a tab switch causes — preventing a completion toast from firing again.
const SIGNIFICANT_EVENT_DISCOVERY_NOTIFIED = ['significant_events_discovery_notified'];

const COMPLETION_INVALIDATED_KEYS = [
  SIGNIFICANT_EVENTS_LIST_QUERY_KEY,
  SIGNIFICANT_EVENTS_FACETS_QUERY_KEY,
  EVENT_BY_ID_QUERY_KEY,
  EVENT_LIFECYCLE_QUERY_KEY,
  DETECTIONS_LIST_QUERY_KEY,
  DETECTION_OVERVIEW_QUERY_KEY,
  DETECTION_ENTITIES_QUERY_KEY,
  NIGHTSHIFT_SIGNIFICANT_EVENTS_QUERY_KEY,
] as const;

const isTerminalStatus = (status: string) =>
  status === SignificantEventsWorkflowStatus.Completed ||
  status === SignificantEventsWorkflowStatus.Failed ||
  status === SignificantEventsWorkflowStatus.Canceled;

interface SignificantEventsPageContextValue {
  isRunning: boolean;
  isCanceling: boolean;
  handleRun: () => void;
  handleCancel: () => void;
}

const SignificantEventsPageContext = createContext<SignificantEventsPageContextValue | null>(null);

interface SignificantEventsPageProviderProps {
  children: React.ReactNode;
  onComplete?: () => void;
}

/** Hosts discovery run/cancel state for the current page. */
export function SignificantEventsPageProvider({
  children,
  onComplete,
}: SignificantEventsPageProviderProps) {
  const {
    application: {
      capabilities: { nightshift },
    },
    notifications: { toasts },
  } = useKibana().services;
  const { canShow } = getNightshiftCapabilities(nightshift);

  const queryClient = useQueryClient();

  const onCompleteRef = useRef(onComplete);

  const {
    triggerSignificantEventsDiscovery,
    cancelSignificantEventsDiscovery,
    getSignificantEventsDiscoveryStatus,
  } = useSignificantEventsDiscoveryApi();

  const { data } = useQuery({
    queryKey: ['significant_events_discovery_status'],
    queryFn: getSignificantEventsDiscoveryStatus,
    enabled: canShow,
    refetchInterval: (result) =>
      result?.status === SignificantEventsWorkflowStatus.InProgress
        ? RUNNING_POLL_INTERVAL_MS
        : false,
  });

  const serverStatus = data?.status;
  const isServerRunning = serverStatus === SignificantEventsWorkflowStatus.InProgress;
  const serverError =
    data?.status === SignificantEventsWorkflowStatus.Failed ? data.error : undefined;

  // Optimistic bridge: true from click until the poll reports a settled status
  // (or any terminal status) for the run we triggered. Cleared as soon as the
  // server reflects reality, so it can't get stuck.
  const [isOptimisticallyRunning, setIsOptimisticallyRunning] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  // Distinguishes explicit user cancel from maintenance-driven cancellation
  // (pause) so we don't toast "discovery canceled" for the latter.
  const userCancelRequestedRef = useRef(false);

  // Execution id of the run we triggered, used to clear the optimistic bridge and
  // to attribute terminal side-effects to our run rather than a previous one.
  const [trackedExecutionId, setTrackedExecutionId] = useState<string | null>(null);

  const isRunning = isOptimisticallyRunning || isServerRunning;

  const { mutate: triggerMutate } = useMutation({
    mutationFn: triggerSignificantEventsDiscovery,
    onSuccess: ({ executionId }) => {
      setTrackedExecutionId(executionId);
      void queryClient.invalidateQueries({ queryKey: ['significant_events_discovery_status'] });
    },
    onError: (error: Error) => {
      setIsOptimisticallyRunning(false);
      setTrackedExecutionId(null);
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.nightshift.discoveryWorkflow.triggerErrorTitle', {
          defaultMessage: 'Failed to start discovery pipeline',
        }),
      });
    },
  });

  const { mutate: cancelMutate } = useMutation({
    mutationFn: cancelSignificantEventsDiscovery,
    onError: (error: Error) => {
      setIsCanceling(false);
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.nightshift.discoveryWorkflow.cancelErrorTitle', {
          defaultMessage: 'Failed to cancel discovery pipeline',
        }),
      });
    },
  });

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // On first mount, treat an already-terminal cached status as already notified,
  // so a completion that happened before this session (or in a prior mount) does
  // not fire a toast now. Runs once per data arrival.
  // Exception: skip executions we triggered ourselves (trackedExecutionId match) —
  // those must fire the toast even if InProgress+Completed arrive in a single batch.
  const didSeedNotifiedRef = useRef(false);
  useEffect(() => {
    if (didSeedNotifiedRef.current) return;
    if (!data?.status) return;
    didSeedNotifiedRef.current = true;
    if (
      isTerminalStatus(data.status) &&
      data.executionId &&
      data.executionId !== trackedExecutionId
    ) {
      queryClient.setQueryData(SIGNIFICANT_EVENT_DISCOVERY_NOTIFIED, data.executionId);
    }
  }, [data?.status, data?.executionId, queryClient, trackedExecutionId]);

  // Clear the optimistic bridge once the poll reports a status for the run we
  // triggered — from then on the server status alone drives isRunning.
  useEffect(() => {
    if (
      isOptimisticallyRunning &&
      trackedExecutionId !== null &&
      data?.executionId === trackedExecutionId
    ) {
      setIsOptimisticallyRunning(false);
    }
  }, [isOptimisticallyRunning, trackedExecutionId, data?.executionId]);

  useEffect(() => {
    const status = data?.status;
    if (!status || !isTerminalStatus(status)) return;

    const executionId = data?.executionId;
    if (!executionId) return;

    // Toast/side-effects fire once per terminal execution, deduped via the cache
    // so a tab-switch remount doesn't re-toast a completion already handled.
    const notified = queryClient.getQueryData<string | null>(SIGNIFICANT_EVENT_DISCOVERY_NOTIFIED);
    if (notified === executionId) return;
    queryClient.setQueryData(SIGNIFICANT_EVENT_DISCOVERY_NOTIFIED, executionId);

    setIsCanceling(false);
    setIsOptimisticallyRunning(false);
    const wasUserCancel = userCancelRequestedRef.current;
    userCancelRequestedRef.current = false;

    const invalidateAll = () =>
      void Promise.all(
        COMPLETION_INVALIDATED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      );

    if (status === SignificantEventsWorkflowStatus.Completed) {
      // Refresh the caller's time range so new documents generated by the pipeline
      // (whose timestamps may be after the locked absoluteRange.to) become visible.
      onCompleteRef.current?.();
      invalidateAll();
      const timer = setTimeout(invalidateAll, TERMINAL_STATUS_TOAST_DELAY_MS);

      toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.discoveryWorkflow.completedTitle', {
          defaultMessage: 'Significant events discovery completed',
        }),
      });

      return () => clearTimeout(timer);
    }

    if (status === SignificantEventsWorkflowStatus.Failed) {
      toasts.addDanger({
        title: i18n.translate('xpack.nightshift.discoveryWorkflow.failedTitle', {
          defaultMessage: 'Significant events discovery failed',
        }),
        text: serverError,
      });
    } else if (wasUserCancel) {
      toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.discoveryWorkflow.canceledTitle', {
          defaultMessage: 'Significant events discovery canceled',
        }),
      });
    }
  }, [data?.status, data?.executionId, serverError, toasts, queryClient]);

  const handleRun = useCallback(() => {
    // Optimistic bridge until the poll reflects the new run; the tracked id is
    // filled in on trigger success, after which the server status drives state.
    setTrackedExecutionId(null);
    setIsCanceling(false);
    userCancelRequestedRef.current = false;
    setIsOptimisticallyRunning(true);
    triggerMutate();
  }, [triggerMutate]);

  const handleCancel = useCallback(() => {
    userCancelRequestedRef.current = true;
    setIsCanceling(true);
    cancelMutate();
  }, [cancelMutate]);

  const value = useMemo<SignificantEventsPageContextValue>(
    () => ({ isRunning, isCanceling, handleRun, handleCancel }),
    [isRunning, isCanceling, handleRun, handleCancel]
  );

  return (
    <SignificantEventsPageContext.Provider value={value}>
      {children}
    </SignificantEventsPageContext.Provider>
  );
}

export function useSignificantEventsPageContext(): SignificantEventsPageContextValue {
  const context = useContext(SignificantEventsPageContext);
  if (!context) {
    throw new Error(
      'useSignificantEventsPageContext must be used within a SignificantEventsPageProvider'
    );
  }
  return context;
}
