/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { POST_SIEM_READINESS_TASK_API_PATH } from './constants';
import type { SiemReadinessTask } from './types';

/**
 * Hook for logging SIEM readiness tasks via API endpoint
 * @param options - TanStack mutation options
 * @returns Mutation hook for logging readiness tasks
 */
export const useLogReadinessTask = (
  options?: UseMutationOptions<void, unknown, SiemReadinessTask>
) => {
  const { http } = useKibana<CoreStart>().services;

  const { mutate: logReadinessTask } = useMutation<void, unknown, SiemReadinessTask>(
    (task: SiemReadinessTask) =>
      http.post<void>(POST_SIEM_READINESS_TASK_API_PATH, {
        body: JSON.stringify(task),
      }),
    options
  );

  return {
    logReadinessTask,
  };
};
