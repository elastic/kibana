/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceLocationErrors, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { TestNowResponse } from '../../../../../common/types';
import { apiService } from '../../../../utils/api_service';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';

export interface EnrichedTestNowResponse extends TestNowResponse {
  configId: string;
}

export const triggerTestNowMonitor = async ({
  configId,
  spaceId,
}: {
  configId: string;
  spaceId?: string;
}): Promise<EnrichedTestNowResponse | undefined> => {
  const res = await apiService.post<TestNowResponse>(
    SYNTHETICS_API_URLS.TEST_NOW_MONITOR + `/${configId}`,
    undefined,
    undefined,
    {
      spaceId,
    }
  );
  return { ...res, configId };
};

export const runOnceMonitor = async ({
  monitor,
  id,
  spaceId,
}: {
  monitor: SyntheticsMonitor;
  id: string;
  spaceId?: string;
}): Promise<{ errors: ServiceLocationErrors }> => {
  return await apiService.post(
    SYNTHETICS_API_URLS.RUN_ONCE_MONITOR + `/${id}`,
    monitor,
    undefined,
    {
      spaceId,
    }
  );
};
