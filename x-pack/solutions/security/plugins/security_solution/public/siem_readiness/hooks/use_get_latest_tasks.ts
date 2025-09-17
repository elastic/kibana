/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { TaskSource } from '../../../server/lib/siem_readiness/routes/get_latest_readiness_tasks';
import { GET_LATEST_SIEM_READINESS_TASKS_API_PATH } from '../../../common/api/siem_readiness/constants';

const GET_LATEST_TASKS_QUERY_KEY = ['latest-readiness-tasks'];

export const useGetLatestTasks = () => {
  const { http } = useKibana<CoreStart>().services;

  const getLatestTasks = useQuery({
    queryKey: GET_LATEST_TASKS_QUERY_KEY,
    queryFn: () => http.get<TaskSource[]>(GET_LATEST_SIEM_READINESS_TASKS_API_PATH),
  });

  return {
    getLatestTasks,
  };
};
