/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StatusResponse } from '@kbn/sample-data-ingest/common';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../constants';
import { useKibana } from './use_kibana';

export const useSampleDataStatus = () => {
  const { sampleDataIngest } = useKibana().services;

  const { data, isLoading } = useQuery<StatusResponse>({
    queryKey: [QueryKeys.FetchSampleDataStatus],
    queryFn: sampleDataIngest?.getStatus,
  });

  return { isInstalled: data?.status === 'installed', indexName: data?.indexName, isLoading };
};
