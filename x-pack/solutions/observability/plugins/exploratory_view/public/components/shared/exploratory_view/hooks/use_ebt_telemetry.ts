/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

export const useEBTTelemetry = ({
  analytics,
  queryName,
}: {
  analytics?: AnalyticsServiceSetup;
  queryName?: string;
}) => {
  const reportEvent = (inspectorAdapters?: Partial<DefaultInspectorAdapters>) => {
    if (inspectorAdapters) {
      const { requests } = inspectorAdapters;
      if (requests && analytics) {
        const listReq = requests.getRequests();

        if (listReq.length > 0) {
          // find the highest query time, since a lens chart can contains more than on query, it doesn't make sense to
          // report all of them , only the query with highest latency needs to be reported
          const duration = listReq.reduce((acc, req) => {
            const queryTime = Number(req.stats?.queryTime.value.split('ms')?.[0]);
            return queryTime > acc ? queryTime : acc;
          }, 0);

          if (duration) {
            reportPerformanceMetricEvent(analytics, {
              eventName: 'exploratory_view_query_time',
              duration,
              meta:
                (queryName && {
                  queryName,
                }) ||
                undefined,
            });
          }
        }
      }
    }
  };

  return {
    reportEvent,
  };
};
