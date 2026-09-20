/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common/constants';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../../common/constants/synthetics_alerts';
import type { ClientPluginsStart } from '../../../../../plugin';
import { useGetUrlParams } from '../../../hooks';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { useMonitorFilters, useMonitorIdFilter } from './use_monitor_filters';

const ALERT_STATUS_FIELD = 'kibana.alert.status';
// See the matching `escapeKuery`-based clause in `use_overview_alerts_annotations.ts`
// for why this mirrors the annotation layer's `monitor.name: *value*` KQL
// wildcard exactly: a `wildcard` query, not `query_string`, so a literal `*`/`?`
// in the search text can be escaped without also having to defend against
// Lucene query syntax (booleans, field qualifiers, grouping) the way a raw
// `query_string` value would require.
const escapeWildcardValue = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

interface Props {
  from: string;
  to: string;
}

export function useOverviewAlertsCount({ from, to }: Props) {
  const { http } = useKibana<ClientPluginsStart>().services;
  const { locations, query: searchQuery } = useGetUrlParams();
  const alertsFilters = useMonitorFilters({ forAlerts: true });
  // A `terms` query, same as the `alertsFilters` conversion below — see
  // `useMonitorIdFilter` for why this can't just be another `UrlFilter` KQL
  // clause the way the rest of `alertsFilters` is handled.
  const monitorIdFilter = useMonitorIdFilter();
  // Spaces are a security boundary for alert data. `useKibanaSpace` reports
  // `loading: false` with `space: undefined` both before the first resolve
  // *and* if the lookup fails — checking `loading` alone would treat a failed
  // lookup as "ready" and let `alertsFilters` (built from the same call inside
  // `useMonitorFilters`) go out unscoped. Require an actually-resolved space.
  const { space, loading: spaceLoading } = useKibanaSpace();
  const spaceReady = !spaceLoading && Boolean(space);

  const abortCtrlRef = useRef(new AbortController());

  const query: estypes.QueryDslQueryContainer = {
    bool: {
      filter: [
        // Anchored on the alert's onset, matching the annotation markers this
        // count should agree with — `@timestamp` is the last write (e.g. the
        // recovery check), which can land outside the window a `kibana.alert.start`
        // inside it would still be counted for by the markers.
        { range: { 'kibana.alert.start': { gte: from, lte: to } } },
        ...(monitorIdFilter ? [monitorIdFilter] : []),
        ...alertsFilters.map(
          (filter): estypes.QueryDslQueryContainer => ({
            terms: { [filter.field]: (filter.values ?? []).map(String) },
          })
        ),
        ...(locations?.length
          ? [{ terms: { 'observer.geo.name': locations } } as estypes.QueryDslQueryContainer]
          : []),
        // Same free-text search box the ping chart and monitor grid already
        // scope to — see the KQL clause in `use_overview_alerts_annotations.ts`
        // for why this only matches `monitor.name` rather than the ping
        // index's full field set. A `wildcard` (not `query_string`) query, and
        // deliberately not `case_insensitive`, to match that clause's `*value*`
        // KQL wildcard semantics against the same keyword field exactly.
        ...(searchQuery
          ? [
              {
                wildcard: {
                  'monitor.name': { value: `*${escapeWildcardValue(searchQuery)}*` },
                },
              } as estypes.QueryDslQueryContainer,
            ]
          : []),
      ],
    },
  };

  const [state, refetch] = useAsyncFn(
    () => {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      return fetchAlertsCount({ http, query, signal: abortCtrlRef.current.signal });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      http,
      from,
      to,
      JSON.stringify(alertsFilters),
      JSON.stringify(monitorIdFilter),
      JSON.stringify(locations),
      searchQuery,
    ],
    { loading: true }
  );

  useEffect(() => {
    if (!spaceReady) {
      return;
    }
    refetch();
  }, [refetch, spaceReady]);

  return {
    count: state.value ?? 0,
    loading: !spaceReady || Boolean(state.loading),
    error: state.error,
  };
}

async function fetchAlertsCount({
  http,
  query,
  signal,
}: {
  http: HttpSetup;
  query: estypes.QueryDslQueryContainer;
  signal: AbortSignal;
}): Promise<number> {
  const response = await http.post<estypes.SearchResponse<Record<string, unknown>>>(
    `${BASE_RAC_ALERTS_API_PATH}/find`,
    {
      signal,
      body: JSON.stringify({
        aggs: {
          count: {
            terms: { field: ALERT_STATUS_FIELD },
          },
        },
        rule_type_ids: [SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE],
        query,
        size: 0,
      }),
    }
  );

  const countAggs = response.aggregations?.count as estypes.AggregationsMultiBucketAggregateBase;
  const buckets = (countAggs?.buckets as estypes.AggregationsStringTermsBucketKeys[]) ?? [];

  return buckets.reduce((total, bucket) => {
    if (bucket.key === ALERT_STATUS_ACTIVE || bucket.key === ALERT_STATUS_RECOVERED) {
      return total + bucket.doc_count;
    }
    return total;
  }, 0);
}
