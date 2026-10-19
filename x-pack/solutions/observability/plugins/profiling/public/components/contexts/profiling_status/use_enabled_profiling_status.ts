/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnabledProfilingStatus } from '@kbn/profiling-utils';
import { useProfilingStatus } from './use_profiling_status';

/**
 * Returns the profiling status of a cluster where profiling is enabled.
 *
 * Only use it in components rendered by `CheckStatus` as its children, which only renders them once
 * the status is loaded and profiling is enabled (`/profiling-not-enabled` excepted). It throws when
 * that isn't the case, so components that can render in any status must stay on `useProfilingStatus` instead.
 */
export const useEnabledProfilingStatus = (): {
  data: EnabledProfilingStatus;
  refresh: () => void;
} => {
  const { data, refresh } = useProfilingStatus();

  if (!data?.isEnabled) {
    throw new Error(
      'useEnabledProfilingStatus must only be used below CheckStatus, once profiling is surely enabled'
    );
  }

  return { data, refresh };
};
