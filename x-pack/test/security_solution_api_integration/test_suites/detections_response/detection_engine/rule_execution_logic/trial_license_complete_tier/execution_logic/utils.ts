/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';

import { NodeMetrics } from '@kbn/task-manager-plugin/server/routes/metrics';
import { RetryService } from '@kbn/ftr-common-functional-services';

export const getMetricsRequest = (request: supertest.Agent, reset: boolean = false) => {
  return request
    .get(`/api/task_manager/metrics${reset ? '' : '?reset=false'}`)
    .set('kbn-xsrf', 'foo')
    .expect(200)
    .then((response) => response.body);
};

export const getMetricsWithRetry = (
  request: supertest.Agent,
  retry: RetryService,
  reset: boolean = false,
  callback?: (metrics: NodeMetrics) => boolean
): Promise<NodeMetrics> => {
  return retry.try(async () => {
    const metrics = await getMetricsRequest(request, reset);

    if (metrics.metrics) {
      if ((callback && callback(metrics)) || !callback) {
        return metrics;
      }
    }

    throw new Error(`Expected metrics not received: ${JSON.stringify(metrics)}`);
  });
};
