/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { LegacyRequest } from '../../types';
import { checkParam } from '../error_missing_required';
import { createApmQuery } from './create_apm_query';
import { apmAggFilterPath, apmUuidsAgg, apmAggResponseHandler } from './_apm_stats';
import { getTimeOfLastEvent } from './_get_time_of_last_event';
import type { ElasticsearchResponse } from '../../../common/types/es';

export function handleResponse(response: ElasticsearchResponse) {
  const { apmTotal, totalEvents } = apmAggResponseHandler(response);

  return {
    totalEvents,
    apms: {
      total: apmTotal,
    },
  };
}

export async function getStats(req: LegacyRequest, apmIndexPattern: string, clusterUuid: string) {
  checkParam(apmIndexPattern, 'apmIndexPattern in getBeats');

  const config = req.server.config;
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();
  const maxBucketSize = config.ui.max_bucket_size;
  const cgroup = config.ui.container.apm.enabled;

  const params = {
    index: apmIndexPattern,
    filter_path: apmAggFilterPath,
    size: 0,
    ignore_unavailable: true,
    body: {
      query: createApmQuery({
        start,
        end,
        clusterUuid,
      }),
      aggs: apmUuidsAgg(maxBucketSize, cgroup),
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const [response, timeOfLastEvent] = await Promise.all([
    callWithRequest(req, 'search', params),
    getTimeOfLastEvent({
      req,
      callWithRequest,
      apmIndexPattern,
      start,
      end,
      clusterUuid,
    }),
  ]);

  const formattedResponse = handleResponse(response);
  return {
    ...formattedResponse,
    timeOfLastEvent,
  };
}
