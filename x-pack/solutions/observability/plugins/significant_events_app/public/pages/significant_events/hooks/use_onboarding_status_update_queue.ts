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
import { useOnboardingApi } from '../../../hooks/use_onboarding_api';

type SourceOnboardingStatusUpdateCallback = (
  sourceId: string,
  status: SignificantEventsWorkflowStatusResult
) => void;

export function useOnboardingStatusUpdateQueue(
  onSourceStatusUpdate: SourceOnboardingStatusUpdateCallback
) {
  const queue = useRef(new Set<string>([]));
  const isProcessing = useRef(false);

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

  const processStatusUpdateQueue = useCallback(async () => {
    if (isProcessing.current) {
      return;
    }

    isProcessing.current = true;

    return await updateStatuses().finally(() => {
      isProcessing.current = false;
    });
  }, [updateStatuses]);

  return { onboardingStatusUpdateQueue: queue.current, processStatusUpdateQueue };
}
