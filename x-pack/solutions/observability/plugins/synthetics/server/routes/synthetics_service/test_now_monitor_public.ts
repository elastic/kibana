/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { TestNowResponse } from '../../../common/types';
import { SyntheticsRestApiRouteFactory } from '../types';
import { triggerTestNow } from './test_now_monitor';

export const testNowMonitorPublicRoute: SyntheticsRestApiRouteFactory<TestNowResponse> = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.TEST_NOW_MONITOR + '/{monitorId}',
  validate: {},
  validation: {
    request: {
      params: schema.object({
        monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
      }),
    },
  },
  handler: async (routeContext) => {
    const { monitorId } = routeContext.request.params;
    return triggerTestNow(monitorId, routeContext);
  },
});
