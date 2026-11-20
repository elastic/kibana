/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  HUNT_WORKER_INDEX_COVERAGE_URL,
  type HuntWorkerIndexCoverageResponse,
} from '@kbn/alertzero-common';
import { retryOnTransientError } from '../retry_on_transient_error';
import { queryKeys } from '../../query_keys';

/** Which patterns of the space's default data view the Hunt worker's account cannot read. */
export const useHuntWorkerIndexCoverage = (enabled: boolean) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.huntWorkerIndexCoverage.coverage(),
    queryFn: (): Promise<HuntWorkerIndexCoverageResponse> =>
      services.http!.get<HuntWorkerIndexCoverageResponse>(HUNT_WORKER_INDEX_COVERAGE_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    enabled,
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
