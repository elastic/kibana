/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { TaskSource, SiemReadinessTask } from './types';
import {
  GET_LATEST_SIEM_READINESS_TASKS_API_PATH,
  POST_SIEM_READINESS_TASK_API_PATH,
} from './constants';
import { validateTask } from './validate_task';

const GET_LATEST_TASKS_QUERY_KEY = ['latest-readiness-tasks'];

export const useReadinessTasks = () => {
  const { http } = useKibana<CoreStart>().services;
  const queryClient = useQueryClient();

  const { mutate: logReadinessTask } = useMutation<void, unknown, SiemReadinessTask>({
    mutationFn: async (task: SiemReadinessTask): Promise<void> => {
      validateTask(task);

      await http.post<void>(POST_SIEM_READINESS_TASK_API_PATH, {
        body: JSON.stringify(task),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_LATEST_TASKS_QUERY_KEY });
    },
  });

  const getLatestTasks = useQuery({
    queryKey: GET_LATEST_TASKS_QUERY_KEY,
    queryFn: () => {
      return http.get<TaskSource[]>(GET_LATEST_SIEM_READINESS_TASKS_API_PATH);
    },
  });

  return {
    logReadinessTask,
    getLatestTasks,
  };
};
