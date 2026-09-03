/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, PND_WORKERS_URL } from '@kbn/pnd-common';
import type { ListWorkersResponse } from '@kbn/pnd-common';
import { queryKeys } from '../query_keys';
import { retryOnTransientError } from './retry_on_transient_error';

/**
 * Reads the Workers catalog, which the route projects from the lanes' real `ai.agent` steps
 * (kibana-phf4.6). There is deliberately no `useToggleWorker` beside it: a projection has nothing to
 * toggle, `PATCH /internal/pnd/workers/{workerId}` answers 400, and the tables render their
 * switches inert rather than sending a request that is always refused.
 */
export const useWorkers = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.workers.list(),
    queryFn: async (): Promise<ListWorkersResponse> =>
      services.http!.get<ListWorkersResponse>(PND_WORKERS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
