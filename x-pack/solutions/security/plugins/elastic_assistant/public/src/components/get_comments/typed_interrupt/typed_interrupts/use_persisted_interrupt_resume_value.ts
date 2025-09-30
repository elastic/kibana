/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InterruptResumeValue,
  InterruptType,
  InterruptValue,
} from '@kbn/elastic-assistant-common';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * A
 * @param interrupt The respective interruptValue
 * @param liveInterruptResumeValue The interruptResumeValue from the server. If none is available, this should be undefined.
 * @returns resumeValue: the liveInterruptResumeValue if it exists, else the cached interruptResumeValue if it exists, else undefined. setCachedResumeValue: sets the cached interruptResumeValue
 */
export const useInterruptResumeValue = <
  T extends InterruptType,
  I extends InterruptValue & { type: T },
  R extends InterruptResumeValue & { type: T }
>(
  interrupt: I,
  liveInterruptResumeValue: R | undefined
) => {
  const cacheInterruptResumeValueKey = [interrupt.id, 'cachedResumeValue'];

  const queryClient = useQueryClient();

  const cachedResumeValue = useQuery({
    queryKey: cacheInterruptResumeValueKey,
    queryFn: () => queryClient.getQueryData<R | undefined>(cacheInterruptResumeValueKey),
    enabled: false, // prevent automatic fetching
    initialData: () => queryClient.getQueryData<R | undefined>(cacheInterruptResumeValueKey),
  });

  const setCachedResumeValue = (newResumeValue: R) => {
    queryClient.setQueryData(cacheInterruptResumeValueKey, newResumeValue);
    cachedResumeValue.refetch();
  };

  return {
    resumeValue: liveInterruptResumeValue ?? cachedResumeValue.data,
    setCachedResumeValue,
  };
};
