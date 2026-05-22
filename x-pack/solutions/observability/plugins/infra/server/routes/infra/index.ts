/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { createRouteValidationFunction, jsonRt } from '@kbn/io-ts-utils';
import {
  GetInfraMetricsRequestBodyPayloadRT,
  GetInfraMetricsRequestParamsRT,
  GetInfraMetricsResponsePayloadRT,
  GetInfraEntityCountRequestBodyPayloadRT,
  GetInfraEntityCountResponsePayloadRT,
  GetInfraEntityCountRequestParamsPayloadRT,
  GetHostsListRequestBodyPayloadRT,
  GetHostsListResponsePayloadRT,
  GetHostsMetricsRequestBodyPayloadRT,
  GetHostsMetricsResponsePayloadRT,
  GetHostsKpisRequestBodyPayloadRT,
  GetHostsKpisResponsePayloadRT,
} from '../../../common/http_api/infra';
import type { InfraBackendLibs } from '../../lib/infra_types';
import { getInfraAlertsClient } from '../../lib/helpers/get_infra_alerts_client';
import { getHosts } from './lib/host/get_hosts';
import { getHostsCount } from './lib/host/get_hosts_count';
import { getHostsList } from './lib/host/get_hosts_list';
import { getHostsMetrics } from './lib/host/get_hosts_metrics';
import { getHostsKpis } from './lib/host/get_hosts_kpis';
import { getInfraMetricsClient } from '../../lib/helpers/get_infra_metrics_client';
import { withInspect } from '../../lib/helpers/with_inspect';
import { getApmDataAccessClient } from '../../lib/helpers/get_apm_data_access_client';
import {
  DEFAULT_SCHEMA,
  MAX_HOSTS_PER_METRICS_REQUEST,
  MAX_HOST_COUNT_LIMIT,
} from '../../../common/constants';
import type { InfraEntityMetricType } from '../../../common/http_api/infra';

const InspectQueryRT = rt.exact(rt.partial({ _inspect: jsonRt.pipe(rt.boolean) }));

// Network metrics that are not supported for semconv schema
// These require derivative aggregations with histogram parents which would
// significantly impact performance and could cause max bucket exceptions
const UNSUPPORTED_SEMCONV_METRICS: InfraEntityMetricType[] = ['rxV2', 'txV2'];

export const initInfraAssetRoutes = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/{entityType}',
      validate: {
        body: createRouteValidationFunction(GetInfraMetricsRequestBodyPayloadRT),
        params: createRouteValidationFunction(GetInfraMetricsRequestParamsRT),
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (context, request) => {
      const { from, to, metrics, limit, query, schema } = request.body;

      if (schema === 'semconv') {
        const unsupportedMetrics = metrics.filter((metric: InfraEntityMetricType) =>
          UNSUPPORTED_SEMCONV_METRICS.includes(metric)
        );

        if (unsupportedMetrics.length > 0) {
          throw Object.assign(
            new Error(
              `The following metrics are not supported for semconv schema: ${unsupportedMetrics.join(
                ', '
              )}`
            ),
            { statusCode: 400 }
          );
        }
      }

      const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

      const [infraMetricsClient, alertsClient, apmDataAccessServices] = await Promise.all([
        getInfraMetricsClient({ request, libs, context }),
        getInfraAlertsClient({ libs, request }),
        apmDataAccessClient.getServices(),
      ]);

      const hosts = await getHosts({
        from,
        to,
        metrics,
        limit,
        query,
        alertsClient,
        infraMetricsClient,
        apmDataAccessServices,
        schema,
      });

      return GetInfraMetricsResponsePayloadRT.encode(hosts);
    })
  );

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/{entityType}/count',
      validate: {
        body: createRouteValidationFunction(GetInfraEntityCountRequestBodyPayloadRT),
        params: createRouteValidationFunction(GetInfraEntityCountRequestParamsPayloadRT),
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (context, request) => {
      const { body, params } = request;
      const { entityType } = params;
      const { query, from, to, schema = DEFAULT_SCHEMA } = body;

      const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

      const [infraMetricsClient, apmDataAccessServices] = await Promise.all([
        getInfraMetricsClient({ request, libs, context }),
        apmDataAccessClient.getServices(),
      ]);

      const count = await getHostsCount({
        infraMetricsClient,
        apmDataAccessServices,
        query,
        from,
        to,
        schema,
      });

      return GetInfraEntityCountResponsePayloadRT.encode({
        entityType,
        count,
      });
    })
  );

  // P10 — Phase A: ranked host name list + alerts on the visible page.
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/host/list',
      validate: {
        body: createRouteValidationFunction(GetHostsListRequestBodyPayloadRT),
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (context, request) => {
      const { from, to, limit, query, schema = DEFAULT_SCHEMA, sort, page } = request.body;

      const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

      const [infraMetricsClient, alertsClient, apmDataAccessServices] = await Promise.all([
        getInfraMetricsClient({ request, libs, context }),
        getInfraAlertsClient({ libs, request }),
        apmDataAccessClient.getServices(),
      ]);

      const result = await getHostsList({
        from,
        to,
        limit,
        query,
        schema,
        sort,
        page,
        infraMetricsClient,
        alertsClient,
        apmDataAccessServices,
      });

      return GetHostsListResponsePayloadRT.encode(result);
    })
  );

  // P10 — Phase B: metadata + metric values for the visible page (≤ 20).
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/host/metrics',
      validate: {
        body: createRouteValidationFunction(GetHostsMetricsRequestBodyPayloadRT),
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (context, request) => {
      const { from, to, names, metrics, query, schema = DEFAULT_SCHEMA } = request.body;

      // Per-request hosts cap. Derived from the UI's
      // `HOSTS_TABLE_PAGE_SIZE_OPTIONS` (max value) so adding a new page-
      // size option to the table will widen the cap automatically. The
      // actual query cost is driven by `names.length` — Phase B asks ES
      // for exactly the hosts in this list, no more and no less — so a
      // client picking 5 rows per page sends 5 names and gets 5-host work.
      if (names.length > MAX_HOSTS_PER_METRICS_REQUEST) {
        throw Object.assign(
          new Error(
            `Phase B is page-bounded: at most ${MAX_HOSTS_PER_METRICS_REQUEST} host names per request (received ${names.length}).`
          ),
          { statusCode: 400 }
        );
      }

      // Note: the legacy `rxV2` / `txV2` semconv guardrail (derivative-on-
      // histogram blew `max_buckets` on large fleets) doesn't apply to this
      // endpoint. Phase B expresses both directions via filter-in-agg
      // averages of `metrics.system.network.io` over the page-bounded set
      // (≤ MAX_HOSTS_PER_METRICS_REQUEST hosts), so `max_buckets` is no
      // longer reachable.
      //
      // The TS-based `RATE(...)` form would be more correct (per-time-
      // series counter reset detection) but the engine currently rejects
      // filter-in-aggregation inside `TS` pipelines, so we use the `FROM`
      // shape for the whole Phase B query — see `get_hosts_metrics.ts`.

      const apmDataAccessClient = getApmDataAccessClient({ request, libs, context });

      const [infraMetricsClient, apmDataAccessServices] = await Promise.all([
        getInfraMetricsClient({ request, libs, context }),
        apmDataAccessClient.getServices(),
      ]);

      const result = await getHostsMetrics({
        infraMetricsClient,
        apmDataAccessServices,
        from,
        to,
        names,
        metrics,
        query,
        schema,
      });

      return GetHostsMetricsResponsePayloadRT.encode(result);
    })
  );

  // P15b — KPI summary endpoint. Replaces four parallel Lens-driven DSL
  // fan-outs (one per tile) with one request that returns the four headline
  // scalars + the host count for the "Average (of N hosts)" subtitle. No
  // time bucketing — the trend line was already dropped in P15a — so the
  // engine-side cell count is `O(hosts × per-state slices)`, well under any
  // realistic Serverless circuit-breaker budget.
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/infra/host/kpis',
      validate: {
        body: createRouteValidationFunction(GetHostsKpisRequestBodyPayloadRT),
        query: createRouteValidationFunction(InspectQueryRT),
      },
    },
    withInspect(async (context, request) => {
      const { from, to, names, query, schema = DEFAULT_SCHEMA } = request.body;

      // Defence in depth: matches Phase A's ceiling so we can't be tricked
      // into aggregating across the whole fleet by a malicious / buggy
      // client. The KPI cost-model invariant (`cells = hosts × states`)
      // assumes this bound holds.
      if (names && names.length > MAX_HOST_COUNT_LIMIT) {
        throw Object.assign(
          new Error(
            `Too many names: KPI endpoint accepts at most ${MAX_HOST_COUNT_LIMIT} host names per request (received ${names.length}).`
          ),
          { statusCode: 400 }
        );
      }

      const infraMetricsClient = await getInfraMetricsClient({ request, libs, context });

      const result = await getHostsKpis({
        infraMetricsClient,
        from,
        to,
        names,
        query,
        schema,
      });

      return GetHostsKpisResponsePayloadRT.encode(result);
    })
  );
};
