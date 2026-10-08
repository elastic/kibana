/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { useCallback, useRef } from 'react';
import { ONBOARDING_START_GRACE_MS } from '../../../constants';
import { useOnboardingApi } from '../../../hooks/use_onboarding_api';

type SourceOnboardingStatusUpdateCallback = (
  sourceId: string,
  status: SignificantEventsWorkflowStatusResult
) => void;

interface IAwaitingStart {
  deadline: number;
  /** Status and execution of the first read; a different one means a new run appeared. */
  baselineKey?: string;
}

const getStatusKey = (status: SignificantEventsWorkflowStatusResult): string =>
  `${status.status}:${status.executionId ?? ''}`;

export function useOnboardingStatusUpdateQueue(
  onSourceStatusUpdate: SourceOnboardingStatusUpdateCallback
) {
  const queue = useRef(new Set<string>([]));
  const isProcessing = useRef(false);
  const awaitingStart = useRef(new Map<string, IAwaitingStart>());

  const { getOnboardingStatuses } = useOnboardingApi();

  const updateStatuses = useCallback(async (): Promise<void> => {
    if (queue.current.size === 0) {
      return;
    }

    const sourceIds = [...queue.current];

    const statuses = await getOnboardingStatuses(sourceIds);

    for (const sourceId of sourceIds) {
      const statusResult = statuses[sourceId];
      if (statusResult === undefined) {
        continue;
      }

      const awaiting = awaitingStart.current.get(sourceId);
      if (awaiting) {
        const key = getStatusKey(statusResult);
        awaiting.baselineKey ??= key;
        if (key === awaiting.baselineKey && Date.now() < awaiting.deadline) {
          // No new run yet. Report nothing: the caller shows the source as generating until the
          // run appears, and a stale terminal status would clear that and fire its callbacks.
          continue;
        }
        awaitingStart.current.delete(sourceId);
      }

      onSourceStatusUpdate(sourceId, statusResult);

      if (!KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(statusResult.status)) {
        queue.current.delete(sourceId);
      }
    }

    if (queue.current.size > 0) {
      await new Promise((res) => setTimeout(res, 2000));
      await updateStatuses();
    }
  }, [getOnboardingStatuses, onSourceStatusUpdate]);

  /**
   * Keeps a created or edited source in the queue until its run starts or the grace period ends.
   * Call before adding the source to the queue.
   */
  const expectOnboardingStart = useCallback((sourceId: string) => {
    awaitingStart.current.set(sourceId, { deadline: Date.now() + ONBOARDING_START_GRACE_MS });
  }, []);

  const processStatusUpdateQueue = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    isProcessing.current = true;

    return await updateStatuses().finally(() => {
      isProcessing.current = false;
    });
  }, [updateStatuses]);

  return {
    onboardingStatusUpdateQueue: queue.current,
    processStatusUpdateQueue,
    expectOnboardingStart,
  };
}
