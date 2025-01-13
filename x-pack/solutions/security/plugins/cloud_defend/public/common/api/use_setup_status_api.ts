/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../hooks/use_kibana';
import { CloudDefendSetupStatus } from '../../../common';
import { CURRENT_API_VERSION, STATUS_ROUTE_PATH } from '../../../common/constants';

const getCloudDefendSetupStatusQueryKey = 'cloud_defend_status_key';

export const useCloudDefendSetupStatusApi = () => {
  const { http } = useKibana().services;
  return useQuery<CloudDefendSetupStatus, unknown, CloudDefendSetupStatus>(
    [getCloudDefendSetupStatusQueryKey],
    () => http.get<CloudDefendSetupStatus>(STATUS_ROUTE_PATH, { version: CURRENT_API_VERSION })
  );
};
